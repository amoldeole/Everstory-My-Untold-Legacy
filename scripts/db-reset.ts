import fs from "node:fs";
import path from "node:path";

import { sql } from "drizzle-orm";

import { closeDb, getDb, resolveDatabaseConfig } from "../src/db";
import { describeDatabase } from "../src/db/config";

/**
 * Destroys all local data.
 *
 * With the embedded database this simply deletes the data directory — fast and
 * unambiguous. Against a real Postgres server we drop and recreate the public
 * schema, which requires `--force` so that nobody points this at production by
 * accident.
 */
async function main(): Promise<void> {
  const force = process.argv.includes("--force") || process.argv.includes("-y");
  const config = resolveDatabaseConfig();

  if (config.driver === "pglite") {
    if (fs.existsSync(config.dataDir)) {
      fs.rmSync(config.dataDir, { recursive: true, force: true });
      console.log(`✓ Removed ${config.dataDir}`);
    } else {
      console.log(`· Nothing to remove at ${config.dataDir}`);
    }
    return;
  }

  if (!force) {
    console.error(`Refusing to reset ${describeDatabase(config)} without --force.`);
    console.error("This drops the entire public schema. Run again with: npm run db:reset -- --force");
    process.exit(1);
  }

  const db = await getDb();
  await db.execute(sql`drop schema if exists public cascade`);
  await db.execute(sql`create schema public`);
  await db.execute(sql`grant all on schema public to public`);
  await closeDb();
  console.log(`✓ Reset ${describeDatabase(config)}`);
  console.log("  Run `npm run db:migrate` to recreate the schema.");
  void path;
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error("✗ Reset failed");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
