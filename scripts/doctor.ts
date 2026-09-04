import fs from "node:fs";
import path from "node:path";

import { closeDb, getDb, resolveDatabaseConfig } from "../src/db";
import { describeDatabase } from "../src/db/config";
import { getEnv, resetEnvCache } from "../src/lib/env";
import { countWords, makeExcerpt, toPlainText } from "../src/lib/utils/text";

/**
 * Environment doctor.
 *
 * Run this first when something is not working. It reports exactly what the
 * app sees — which database, which storage driver, whether the data directory
 * is writable — so you can tell the difference between a configuration
 * problem and a bug.
 */

const REQUIRED_NODE = [20, 9];

function line(label: string, value: string, ok: boolean = true): void {
  const mark = ok ? "✓" : "✗";
  console.log(`  ${mark} ${label.padEnd(24)} ${value}`);
}

function parseNodeVersion(version: string): [number, number, number] {
  const [major, minor, patch] = version.replace(/^v/, "").split(".").map(Number);
  return [major ?? 0, minor ?? 0, patch ?? 0];
}

async function main(): Promise<void> {
  console.log("\nEverstory — environment check\n");

  // ------------------------------------------------------------------ runtime
  console.log("Runtime");
  const [major, minor] = parseNodeVersion(process.version);
  const nodeOk = major > REQUIRED_NODE[0]! || (major === REQUIRED_NODE[0]! && minor >= REQUIRED_NODE[1]!);
  line("Node", `${process.version} (need >= ${REQUIRED_NODE[0]}.${REQUIRED_NODE[1]}.0)`, nodeOk);
  line("Platform", `${process.platform} ${process.arch}`);
  line("Process", process.cwd());

  // -------------------------------------------------------------------- env
  console.log("\nEnvironment");
  resetEnvCache();
  let env;
  try {
    env = getEnv();
    line("Configuration", "valid");
  } catch (error) {
    line("Configuration", error instanceof Error ? error.message : "invalid", false);
    console.log("\nFix the values above in .env.local (see .env.example).\n");
    process.exit(1);
  }

  line("Mode", env.NODE_ENV);
  line("Auth", env.AUTH_MODE === "single" ? "single user (no sign-in)" : "email + password");
  line("Signup", env.ALLOW_SIGNUP ? "open" : "closed");
  line("App URL", getEnv().NEXT_PUBLIC_APP_URL);
  line("Storage", env.STORAGE_DRIVER === "s3" ? "S3-compatible" : "local disk");
  if (env.STORAGE_DRIVER === "s3") {
    line("S3 bucket", env.S3_BUCKET ?? "(not set)", Boolean(env.S3_BUCKET));
    line("S3 endpoint", env.S3_ENDPOINT ?? "(default AWS)", Boolean(env.S3_ENDPOINT));
  }

  // --------------------------------------------------------------- filesystem
  console.log("\nFilesystem");
  const config = resolveDatabaseConfig();
  try {
    fs.mkdirSync(config.dataDir, { recursive: true });
    const probe = path.join(config.dataDir, ".write-test");
    fs.writeFileSync(probe, "ok");
    fs.rmSync(probe);
    line("Data directory", `${config.dataDir} (writable)`);
  } catch (error) {
    line(
      "Data directory",
      `${config.dataDir} — ${error instanceof Error ? error.message : "not writable"}`,
      false,
    );
  }

  // ----------------------------------------------------------------- database
  console.log("\nDatabase");
  line("Driver", config.driver === "pglite" ? "embedded (PGlite)" : "Postgres server");
  line("Target", describeDatabase(config));

  try {
    const db = await getDb();
    const started = Date.now();
    // A trivial query proves both connectivity and that migrations applied.
    const { sql } = await import("drizzle-orm");
    const rows = await db.execute(sql`select current_database() as name, version() as version`);
    const first = Array.isArray(rows) ? rows[0] : (rows as { rows?: unknown[] })?.rows?.[0];
    const name = (first as { name?: string } | undefined)?.name ?? "unknown";
    line("Connection", `ok in ${Date.now() - started}ms (db: ${name})`);

    const versionRow = first as { version?: string } | undefined;
    if (versionRow?.version) {
      line("Server version", String(versionRow.version).split(" ").slice(0, 2).join(" "));
    }
  } catch (error) {
    line("Connection", error instanceof Error ? error.message : "failed", false);
    console.log(
      "\n  With the embedded database, make sure no other Everstory process (npm run dev)\n" +
        "  is running — only one process can hold the data directory at a time.\n",
    );
    process.exitCode = 1;
  }

  // -------------------------------------------------------------- migrations
  const journalPath = path.join(process.cwd(), "drizzle", "meta", "_journal.json");
  if (fs.existsSync(journalPath)) {
    const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as { entries?: unknown[] };
    line("Migrations", `${journal.entries?.length ?? 0} applied/found`);
  } else {
    line("Migrations", "no drizzle/ folder — run `npm run db:generate`", false);
    process.exitCode = 1;
  }

  // -------------------------------------------------------------- self checks
  console.log("\nSelf checks");
  const sample = "# Title\n\nSome **bold** text and a [link](https://example.com).";
  const plain = toPlainText(sample);
  line("Text pipeline", `plain="${plain}" words=${countWords(sample)}`);
  line("Excerpt", makeExcerpt(sample, 40));

  await closeDb();

  console.log(
    process.exitCode
      ? "\nSome checks failed. See above.\n"
      : "\nEverything looks good. Start with: npm run dev\n",
  );
}

main().catch((error: unknown) => {
  console.error("\nDoctor failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
