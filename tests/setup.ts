import { afterAll } from "vitest";

/**
 * Test environment setup.
 *
 * Tests talk to a real database — ideally the same engine you deploy to, so
 * that constraints, defaults and types behave identically. By default that is
 * PGlite (embedded Postgres) pointed at a scratch directory; CI also runs the
 * suite against a real Postgres server by setting `DATABASE_URL`.
 */
// NODE_ENV is readonly in the Node typings; assign through the record.
(process.env as Record<string, string | undefined>).NODE_ENV = "test";

const usingExternalPostgres = Boolean(process.env.DATABASE_URL);

if (!usingExternalPostgres) {
  // Isolate local test runs from the development database entirely.
  process.env.EVERSTORY_DATA_DIR = ".data/test";
}

process.env.ALLOW_SIGNUP = "true";
process.env.SESSION_TTL_DAYS = "1";
process.env.STORAGE_DRIVER = "disk";

afterAll(async () => {
  const { closeDb } = await import("@/db");
  await closeDb();
});
