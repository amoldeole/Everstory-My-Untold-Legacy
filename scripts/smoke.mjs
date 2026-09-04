#!/usr/bin/env node
/**
 * Smoke test against a running Everstory server.
 *
 * Deliberately dependency-free (Node's built-in fetch) so it works on a CI
 * runner, inside a bare container, or on your laptop with nothing installed.
 *
 *   node scripts/smoke.mjs
 *   node scripts/smoke.mjs --url https://everstory.example.com
 *   node scripts/smoke.mjs --url http://localhost:3000 --retries 30
 */

function parseArgs(argv) {
  const args = { url: process.env.SMOKE_URL ?? "http://localhost:3000", retries: 1, delayMs: 1000 };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--url" || value === "-u") args.url = argv[index + 1] ?? args.url;
    if (value === "--retries" || value === "-r") args.retries = Number.parseInt(argv[index + 1] ?? "1", 10);
    if (value === "--delay") args.delayMs = Number.parseInt(argv[index + 1] ?? "1000", 10);
  }
  if (!Number.isFinite(args.retries) || args.retries < 1) args.retries = 1;
  return args;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function check(url, { method = "GET", expect = 200, expectBody = null } = {}) {
  const started = Date.now();
  try {
    const response = await fetch(url, { method, redirect: "manual" });
    const ms = Date.now() - started;
    const okStatus = response.status === expect;
    let bodyOk = true;
    if (expectBody !== null && okStatus) {
      const text = await response.text();
      bodyOk = text.includes(expectBody);
    }
    return { ok: okStatus && bodyOk, status: response.status, ms, detail: `${method} ${url}` };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      ms: Date.now() - started,
      detail: `${method} ${url} — ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = args.url.replace(/\/+$/, "");

  console.log(`Smoke testing ${base}`);

  // Wait for the server (Docker containers and cold starts take a moment).
  for (let attempt = 1; attempt <= args.retries; attempt += 1) {
    const health = await check(`${base}/api/health`, { expectBody: '"status":"ok"' });
    if (health.ok) {
      console.log(`  ✓ health endpoint (${health.status}, ${health.ms}ms)`);
      break;
    }
    if (attempt === args.retries) {
      console.error(`  ✗ health endpoint never became healthy — ${health.detail}`);
      process.exit(1);
    }
    await sleep(args.delayMs);
  }

  const checks = [
    check(`${base}/`, { expectBody: "Everstory" }),
    check(`${base}/login`, { expectBody: "Sign in" }),
    check(`${base}/signup`, { expectBody: "Begin your Everstory" }),
    // A page that requires a session must redirect rather than leak content.
    check(`${base}/dashboard`, { expect: 307 }),
    // Unauthenticated API access must be refused.
    check(`${base}/api/entries/00000000-0000-0000-0000-000000000000`, { expect: 401 }),
    // An unknown share token must 404, not 500.
    check(`${base}/share/definitely-not-a-real-token`, { expect: 404 }),
  ];

  const results = await Promise.all(checks);

  let failed = 0;
  for (const result of results) {
    if (result.ok) {
      console.log(`  ✓ ${result.status} in ${result.ms}ms — ${result.detail}`);
    } else {
      failed += 1;
      console.error(`  ✗ got ${result.status}, wanted something else — ${result.detail}`);
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }

  console.log("\nAll smoke checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
