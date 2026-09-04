import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Standalone output produces a self-contained `.next/standalone` directory
   * with only the runtime dependencies the server needs — that is what keeps
   * the Docker image small.
   *
   * It is opt-in via `NEXT_OUTPUT=standalone` (set in the Dockerfile) because
   * `next start` does not work with standalone output, and `npm run build &&
   * npm start` is a workflow people reasonably expect to work on their own
   * machine.
   */
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,

  // Run images through Next's optimizer but never require a remote
  // allowlist at build time; all remote hosts are opt-in via env.
  images: {
    remotePatterns: [],
  },

  // These packages load WASM / native assets and must NOT be bundled by
  // Turbopack or webpack. Keeping them external is what lets the same build
  // run on macOS, Windows, Linux and inside the Docker image.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],

  // Make sure the generated SQL migrations are traced into `next build`
  // output (including the standalone output used by the Docker image),
  // because migrations are applied at runtime from disk.
  outputFileTracingIncludes: {
    "/**": ["./drizzle/**/*"],
  },

  // Linting runs as its own CI step (`npm run lint`) so we get precise failures.

  typedRoutes: false,

  experimental: {
    // Uploads are handled by our own storage abstraction.
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
