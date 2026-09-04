import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { media } from "@/db/schema";
import { authenticate, apiError } from "@/server/api/helpers";
import { getStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

/**
 * Serves an uploaded file.
 *
 * Uploads live outside `public/` so that they can never be guessed or hot
 * linked; this handler is the only way in, and it checks ownership first.
 */
export async function GET(request: Request, context: Context) {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const db = await getDb();

  const [row] = await db
    .select()
    .from(media)
    .where(and(eq(media.id, id), eq(media.userId, auth.user.id)))
    .limit(1);

  if (!row) return apiError("File not found.", 404);

  const storage = getStorage();
  const object = await storage.get(row.storageKey);
  if (!object) return apiError("File is no longer available.", 410);

  return new Response(new Uint8Array(object.body), {
    status: 200,
    headers: {
      "content-type": object.contentType || row.mimeType,
      "content-length": String(object.size),
      "content-disposition": `inline; filename="${encodeURIComponent(row.filename)}"`,
      // Files are immutable once written; the id changes when the file does.
      "cache-control": "private, max-age=31536000, immutable",
    },
  });
}

export async function DELETE(request: Request, context: Context) {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const db = await getDb();

  const [row] = await db
    .select({ id: media.id, storageKey: media.storageKey })
    .from(media)
    .where(and(eq(media.id, id), eq(media.userId, auth.user.id)))
    .limit(1);

  if (!row) return apiError("File not found.", 404);

  try {
    await getStorage().delete(row.storageKey);
  } catch {
    // Continue: the database row should go even if the blob is already gone.
  }

  await db.delete(media).where(and(eq(media.id, id), eq(media.userId, auth.user.id)));
  return new Response(null, { status: 204 });
}
