import path from "node:path";

import { defineConfig } from "vitest/config";

/**
 * Test configuration.
 *
 * Tests run against the same embedded Postgres (PGlite) the dev server uses,
 * so there is nothing to install and no service to start. Set `DATABASE_URL`
 * to run the whole suite against a real Postgres server instead — CI does
 * exactly that in a second job.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // `server-only` / `client-only` are build-time markers that Next.js
      // replaces. Outside Next they are inert.
      "server-only": path.resolve(__dirname, "./tests/mocks/server-only.ts"),
      "client-only": path.resolve(__dirname, "./tests/mocks/client-only.ts"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts"],
    // One worker per test file would each open the embedded database; PGlite
    // is single-process, so we keep everything in a single fork.
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Never run more than one file at a time against the shared database.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    setupFiles: ["tests/setup.ts"],
  },
});
