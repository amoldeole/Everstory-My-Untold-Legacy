import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { entries, media } from "@/db/schema";
import { authenticate, apiError, json, rateLimit } from "@/server/api/helpers";
import { buildStorageKey, getStorage, isAllowedUploadType, maxUploadBytes } from "@/lib/storage";

export const dynamic = "force-dynamic";
// Route Handlers on Node (not Edge) — we need Buffer and the filesystem.
export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;

  const limit = rateLimit(`upload:${auth.user.id}`, 60, 60_000);
  if (!limit.ok) return apiError("Too many uploads. Try again shortly.", 429);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError("Expected multipart form data.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return apiError("No file was provided.", 400);

  if (file.size === 0) return apiError("That file is empty.", 400);
  if (file.size > maxUploadBytes()) {
    return apiError(
      `That file is too large. The limit is ${Math.round(maxUploadBytes() / 1024 / 1024)} MB.`,
      413,
    );
  }
  if (!isAllowedUploadType(file.type)) {
    return apiError(`Unsupported file type: ${file.type || "unknown"}.`, 415);
  }

  const entryIdField = form.get("entryId");
  const entryId = typeof entryIdField === "string" && entryIdField.length > 0 ? entryIdField : null;

  const db = await getDb();
  if (entryId) {
    const [owned] = await db
      .select({ id: entries.id })
      .from(entries)
      .where(and(eq(entries.id, entryId), eq(entries.userId, auth.user.id)))
      .limit(1);
    if (!owned) return apiError("Entry not found.", 404);
  }

  const storage = getStorage();
  const key = buildStorageKey(auth.user.id, file.type);
  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    await storage.put(key, bytes, { contentType: file.type, filename: file.name });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Upload failed.", 500);
  }

  const [row] = await db
    .insert(media)
    .values({
      userId: auth.user.id,
      entryId,
      storageKey: key,
      filename: file.name.slice(0, 200),
      mimeType: file.type,
      byteSize: bytes.byteLength,
    })
    .returning({
      id: media.id,
      filename: media.filename,
      mimeType: media.mimeType,
      byteSize: media.byteSize,
      createdAt: media.createdAt,
    });

  return json({ media: row }, 201);
}
