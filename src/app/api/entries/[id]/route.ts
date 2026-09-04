import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { entries } from "@/db/schema";
import { authenticate, apiError, json, parseBody, rateLimit } from "@/server/api/helpers";
import { applyEntryPatch, entryPatchSchema } from "@/server/entries/service";
import { getEntry } from "@/server/queries/entries";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const entry = await getEntry(auth.user.id, id);
  if (!entry) return apiError("Entry not found.", 404);
  return json({ entry });
}

/**
 * Autosave endpoint.
 *
 * The editor calls this on a debounce. It accepts a partial patch so the
 * writer never has to think about saving.
 */
export async function PATCH(request: Request, context: Context) {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;

  const limit = rateLimit(`patch:${auth.user.id}`, 240, 60_000);
  if (!limit.ok) return apiError("Too many saves. Slow down a moment.", 429);

  const { id } = await context.params;
  const body = await parseBody(request, entryPatchSchema);
  if (!body.ok) return body.response;

  const db = await getDb();
  const [owned] = await db
    .select({ id: entries.id })
    .from(entries)
    .where(and(eq(entries.id, id), eq(entries.userId, auth.user.id)))
    .limit(1);

  if (!owned) return apiError("Entry not found.", 404);

  const updated = await applyEntryPatch(auth.user.id, id, body.data);
  if (!updated) return apiError("Could not save the entry.", 500);

  revalidatePath("/dashboard");
  revalidatePath("/entries");

  return json({ ok: true, savedAt: new Date().toISOString() });
}

export async function DELETE(request: Request, context: Context) {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const db = await getDb();

  const deleted = await db
    .delete(entries)
    .where(and(eq(entries.id, id), eq(entries.userId, auth.user.id)))
    .returning({ id: entries.id });

  if (deleted.length === 0) return apiError("Entry not found.", 404);

  revalidatePath("/dashboard");
  revalidatePath("/entries");

  return json({ ok: true });
}
