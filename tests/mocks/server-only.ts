/**
 * Test stub for the `server-only` package.
 *
 * Next.js resolves `server-only` to an empty module on the server and replaces
 * it with a throwing module on the client. Vitest has neither concept, so we
 * alias it to this no-op — the guard is a build-time concern, not a runtime
 * behaviour worth testing.
 */
export {};
