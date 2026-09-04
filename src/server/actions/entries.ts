"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { entries, media, milestones } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { getStorage } from "@/lib/storage";
import { generateShareToken } from "@/lib/utils/text";
import { createEntryForUser } from "@/server/entries/service";

/**
 * Server Actions for entries.
 *
 * Everything here is a thin wrapper around `@/server/entries/service`, which
 * holds the actual logic. The split exists because a `"use server"` module may
 * only export async functions — schemas and helpers live next door.
 */

export async function createEntryAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const read = (key: string): string | null => {
    const value = formData.get(key);
    return typeof value === "string" && value.length > 0 ? value : null;
  };

  const entryId = await createEntryForUser({
    userId: user.id,
    promptSlug: read("promptSlug"),
    promptId: read("promptId"),
    chapterSlug: read("chapterSlug"),
    title: read("title"),
  });

  redirect(`/write/${entryId}`);
}

export async function deleteEntryAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const entryId = formData.get("entryId");
  if (typeof entryId !== "string" || !entryId) return;

  const db = await getDb();

  // Remove the blobs first — database rows cascade, uploaded files do not.
  const files = await db
    .select({ id: media.id, storageKey: media.storageKey })
    .from(media)
    .where(and(eq(media.entryId, entryId), eq(media.userId, user.id)));

  const storage = getStorage();
  await Promise.all(
    files.map(async (file) => {
      try {
        await storage.delete(file.storageKey);
      } catch {
        // A missing object must not block deleting the entry.
      }
    }),
  );

  await db.delete(milestones).where(and(eq(milestones.entryId, entryId), eq(milestones.userId, user.id)));
  await db.delete(entries).where(and(eq(entries.id, entryId), eq(entries.userId, user.id)));

  revalidatePath("/entries");
  revalidatePath("/dashboard");
  redirect("/entries");
}

export async function toggleEntryShareAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const entryId = formData.get("entryId");
  if (typeof entryId !== "string" || !entryId) return;

  const db = await getDb();
  const [existing] = await db
    .select({ shareEnabled: entries.shareEnabled, shareToken: entries.shareToken })
    .from(entries)
    .where(and(eq(entries.id, entryId), eq(entries.userId, user.id)))
    .limit(1);

  if (!existing) return;

  await db
    .update(entries)
    .set({
      shareEnabled: !existing.shareEnabled,
      shareToken: existing.shareToken ?? generateShareToken(),
      updatedAt: new Date(),
    })
    .where(and(eq(entries.id, entryId), eq(entries.userId, user.id)));

  revalidatePath(`/write/${entryId}`);
  revalidatePath("/entries");
}

export async function togglePinAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const entryId = formData.get("entryId");
  if (typeof entryId !== "string" || !entryId) return;

  const db = await getDb();
  const [existing] = await db
    .select({ pinned: entries.pinned })
    .from(entries)
    .where(and(eq(entries.id, entryId), eq(entries.userId, user.id)))
    .limit(1);

  if (!existing) return;

  await db
    .update(entries)
    .set({ pinned: !existing.pinned, updatedAt: new Date() })
    .where(and(eq(entries.id, entryId), eq(entries.userId, user.id)));

  revalidatePath("/entries");
  revalidatePath("/dashboard");
}
