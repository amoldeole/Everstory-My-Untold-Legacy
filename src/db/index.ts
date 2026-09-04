import path from "node:path";
import fs from "node:fs";

import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import * as schema from "./schema";
import { describeDatabase, resolveDatabaseConfig, type ResolvedDatabaseConfig } from "./config";

export { resolveDatabaseConfig };

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

export type { ResolvedDatabaseConfig };

interface DatabaseHandle {
  db: Database;
  config: ResolvedDatabaseConfig;
  close: () => Promise<void>;
}

/**
 * Next.js hot-reloads modules in development and serverless platforms create
 * a fresh module registry per invocation. Pinning the handle to `globalThis`
 * prevents us from opening a new connection (or a second PGlite instance
 * fighting over the same data directory) on every reload.
 */
const globalForDb = globalThis as unknown as { __everstoryDb?: Promise<DatabaseHandle> | null };

function candidateMigrationsFolders(cwd: string): string[] {
  return [
    path.join(cwd, "drizzle"),
    path.join(cwd, ".next", "server", "drizzle"),
    path.join(cwd, "src", "db", "drizzle"),
  ];
}

function resolveMigrationsFolder(cwd: string): string {
  for (const candidate of candidateMigrationsFolders(cwd)) {
    if (fs.existsSync(/* turbopackIgnore: true */ path.join(candidate, "meta", "_journal.json")))
      return candidate;
  }
  // Fall back to the canonical location; the migrator raises a clear error if
  // the folder is genuinely missing.
  return path.join(cwd, "drizzle");
}

async function createHandle(): Promise<DatabaseHandle> {
  const config = resolveDatabaseConfig();

  if (config.driver === "pglite") {
    fs.mkdirSync(/* turbopackIgnore: true */ config.url, { recursive: true });
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const client = new PGlite(config.url);
    await client.waitReady;
    const db = drizzle(client, { schema }) as unknown as Database;
    return {
      db,
      config,
      close: async () => {
        await client.close();
      },
    };
  }

  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");

  const wantsSsl = /sslmode=require/i.test(config.url) || process.env.PGSSL === "true";
  const pool = new Pool({
    connectionString: config.url,
    max: Number.parseInt(process.env.DATABASE_POOL_MAX ?? "10", 10),
    ...(wantsSsl ? { ssl: { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== "false" } } : {}),
  });

  const db = drizzle(pool, { schema }) as unknown as Database;
  return {
    db,
    config,
    close: async () => {
      await pool.end();
    },
  };
}

async function migrate(handle: DatabaseHandle): Promise<void> {
  const folder = resolveMigrationsFolder(process.cwd());

  if (handle.config.driver === "pglite") {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(handle.db as never, { migrationsFolder: folder });
    return;
  }

  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  await migrate(handle.db as never, { migrationsFolder: folder });
}

const globalForMigration = globalThis as unknown as { __everstoryMigration?: Promise<void> | null };

/**
 * Returns a ready-to-use database handle, applying any pending migrations
 * exactly once per process.
 */
export async function getDb(): Promise<Database> {
  if (!globalForDb.__everstoryDb) {
    globalForDb.__everstoryDb = createHandle();
  }
  const handle = await globalForDb.__everstoryDb;

  if (!globalForMigration.__everstoryMigration) {
    globalForMigration.__everstoryMigration = migrate(handle).catch((error) => {
      // Allow a later call to retry rather than caching the failure forever.
      globalForMigration.__everstoryMigration = null;
      throw error;
    });
  }
  await globalForMigration.__everstoryMigration;

  return handle.db;
}

/** Human-readable description of the active database — safe for logs. */
export function activeDatabaseDescription(): string {
  return describeDatabase(resolveDatabaseConfig());
}

/** Closes the underlying connection. Used by scripts and by tests. */
export async function closeDb(): Promise<void> {
  if (!globalForDb.__everstoryDb) return;
  const handle = await globalForDb.__everstoryDb;
  globalForDb.__everstoryDb = null;
  globalForMigration.__everstoryMigration = null;
  await handle.close();
}

export { schema };
