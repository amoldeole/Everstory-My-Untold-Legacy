import { sql } from "drizzle-orm";

import { getDb, activeDatabaseDescription } from "@/db";
import { apiError, json } from "@/server/api/helpers";

export const dynamic = "force-dynamic";

/**
 * Health and readiness probe.
 *
 * Used by the Docker `HEALTHCHECK`, by `scripts/smoke.mjs`, and by whatever
 * platform you deploy to. It deliberately does not require authentication —
 * it reports only whether the process is up and can reach the database.
 */
export async function GET() {
  const started = Date.now();

  try {
    const db = await getDb();
    const rows = await db.execute(sql`select 1 as ok`);
    const ok = Array.isArray(rows) ? rows.length > 0 : Boolean(rows);

    if (!ok) {
      return apiError("Database did not respond.", 503);
    }

    return json({
      status: "ok",
      uptimeSeconds: Math.round(process.uptime()),
      database: activeDatabaseDescription(),
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
      node: process.version,
      responseMs: Date.now() - started,
    });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Unhealthy", 503);
  }
}
