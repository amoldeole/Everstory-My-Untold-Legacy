import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

/**
 * Loads `.env` files the same way Next.js does, so that CLI scripts
 * (`drizzle-kit`, seed, migrate, doctor) and the Next.js runtime always see a
 * consistent environment. Files are loaded in precedence order and never
 * overwrite variables that are already set in the real environment — which is
 * what you want in CI and in Docker, where the platform provides the values.
 */
export function loadEnv(cwd: string = process.cwd()): void {
  const files = [".env.local", ".env", ".env.development.local", ".env.production.local"];
  for (const file of files) {
    const full = path.join(/* turbopackIgnore: true */ cwd, file);
    if (!existsSync(/* turbopackIgnore: true */ full)) continue;
    try {
      // `createRequire` keeps this file loadable from both ESM and CJS, which
      // matters because drizzle-kit, tsx and Next.js each load it differently
      // and a bare `require` exists in only some of those.
      const require = createRequire(__filename);
      const dotenv = require("dotenv") as typeof import("dotenv");
      dotenv.config({ path: full, override: false, quiet: true });
    } catch {
      // dotenv is optional at runtime; environment variables still work.
    }
  }
}

loadEnv();

export type DatabaseDriver = "pglite" | "postgres";

export interface ResolvedDatabaseConfig {
  driver: DatabaseDriver;
  /** Connection string for Postgres, or the on-disk directory for PGlite. */
  url: string;
  /** Root directory for all mutable local state (database, uploads, exports). */
  dataDir: string;
  isEmbedded: boolean;
}

/**
 * Resolves which database to use.
 *
 * - `DATABASE_URL` set  -> a real Postgres server (Docker, Neon, Supabase,
 *   RDS, Cloud SQL, your own VPS...).
 * - `DATABASE_URL` unset -> PGlite, an embedded Postgres build that runs in
 *   process. This is why `git clone && npm install && npm run dev` works on a
 *   MacBook or a Windows laptop with Docker, a database server and any native
 *   toolchain installed.
 */
export function resolveDatabaseConfig(cwd: string = process.cwd()): ResolvedDatabaseConfig {
  const rawUrl = process.env.DATABASE_URL?.trim();
  const dataDir = path.resolve(cwd, process.env.EVERSTORY_DATA_DIR?.trim() || ".data");

  if (rawUrl && rawUrl.length > 0) {
    return {
      driver: "postgres",
      url: rawUrl,
      dataDir,
      isEmbedded: false,
    };
  }

  return {
    driver: "pglite",
    url: path.join(dataDir, "pgdata"),
    dataDir,
    isEmbedded: true,
  };
}

export function describeDatabase(config: ResolvedDatabaseConfig = resolveDatabaseConfig()): string {
  if (config.driver === "pglite") {
    return `embedded Postgres (PGlite) at ${config.url}`;
  }
  const safe = redactConnectionString(config.url);
  return `Postgres server at ${safe}`;
}

/** Removes credentials from a Postgres connection string so it is safe to log. */
export function redactConnectionString(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = "***";
    return parsed.toString();
  } catch {
    return url.replace(/\/\/[^@]*@/, "//***@");
  }
}
