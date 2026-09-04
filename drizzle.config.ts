import { defineConfig } from "drizzle-kit";
import { resolveDatabaseConfig } from "./src/db/config";

const { driver, url } = resolveDatabaseConfig();

/**
 * Drizzle Kit configuration.
 *
 * Works with zero configuration for local development (PGlite, an embedded
 * Postgres compiled to WebAssembly) and switches to a real Postgres server
 * the moment `DATABASE_URL` is present. That is what makes the project run
 * identically on macOS, Windows, Linux and CI.
 */
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  ...(driver === "pglite" ? { dbCredentials: { url: url } } : { dbCredentials: { url } }),
  verbose: true,
  strict: true,
});
