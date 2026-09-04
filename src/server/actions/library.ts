"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { chapters, entries, milestones, people } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { DEFAULT_CHAPTERS } from "@/lib/catalog/chapters";
import { slugify } from "@/lib/utils/text";

/* ---------------------------------------------------------------- chapters */

export async function createChapterAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 1 || title.length > 80) return;

  const db = await getDb();
  const positionRows = await db
    .select({ value: sql<number>`coalesce(max(${chapters.position}), -1)::int` })
    .from(chapters)
    .where(eq(chapters.userId, user.id));
  const maxPosition = positionRows[0]?.value ?? -1;

  let slug = slugify(title) || `chapter-${Date.now()}`;
  const existing = await db
    .select({ id: chapters.id })
    .from(chapters)
    .where(and(eq(chapters.userId, user.id), eq(chapters.slug, slug)))
    .limit(1);
  if (existing.length > 0) slug = `${slug}-${Date.now().toString(36)}`;

  await db.insert(chapters).values({
    userId: user.id,
    slug,
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    emoji:
      String(formData.get("emoji") ?? "")
        .trim()
        .slice(0, 4) || "📖",
    position: maxPosition + 1,
  });

  revalidatePath("/chapters");
}

export async function updateChapterAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("chapterId") ?? "");
  if (!id) return;

  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 1 || title.length > 80) return;

  const db = await getDb();
  await db
    .update(chapters)
    .set({
      title,
      description: String(formData.get("description") ?? "").trim() || null,
      emoji:
        String(formData.get("emoji") ?? "")
          .trim()
          .slice(0, 4) || "📖",
      updatedAt: new Date(),
    })
    .where(and(eq(chapters.id, id), eq(chapters.userId, user.id)));

  revalidatePath("/chapters");
  revalidatePath("/dashboard");
}

export async function deleteChapterAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("chapterId") ?? "");
  if (!id) return;

  const db = await getDb();
  // Entries are kept — `chapterId` is set to null by the foreign key.
  await db.delete(chapters).where(and(eq(chapters.id, id), eq(chapters.userId, user.id)));

  revalidatePath("/chapters");
  revalidatePath("/dashboard");
  redirect("/chapters");
}

/** Restores the default chapter set, filling in any that were deleted. */
export async function restoreDefaultChaptersAction(): Promise<void> {
  const user = await requireUser();
  const db = await getDb();

  const existing = await db
    .select({ slug: chapters.slug })
    .from(chapters)
    .where(eq(chapters.userId, user.id));
  const have = new Set(existing.map((row) => row.slug));

  const missing = DEFAULT_CHAPTERS.filter((chapter) => !have.has(chapter.slug));
  if (missing.length === 0) return;

  await db.insert(chapters).values(
    missing.map((chapter) => ({
      userId: user.id,
      slug: chapter.slug,
      title: chapter.title,
      description: chapter.description,
      emoji: chapter.emoji,
      position: chapter.position,
    })),
  );

  revalidatePath("/chapters");
  revalidatePath("/dashboard");
}

/* ------------------------------------------------------------------ people */

export async function upsertPersonAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 1 || name.length > 80) return;

  const id = String(formData.get("personId") ?? "");
  const values = {
    name,
    relationship: String(formData.get("relationship") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  const db = await getDb();

  if (id) {
    await db
      .update(people)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(people.id, id), eq(people.userId, user.id)));
  } else {
    await db.insert(people).values({ ...values, userId: user.id });
  }

  revalidatePath("/people");
}

export async function deletePersonAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("personId") ?? "");
  if (!id) return;

  const db = await getDb();
  await db.delete(people).where(and(eq(people.id, id), eq(people.userId, user.id)));
  revalidatePath("/people");
}

/* --------------------------------------------------------------- milestones */

export async function upsertMilestoneAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  const occurredOn = String(formData.get("occurredOn") ?? "").trim();

  if (title.length < 1 || title.length > 120) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) return;

  const id = String(formData.get("milestoneId") ?? "");
  const entryId = String(formData.get("entryId") ?? "").trim();
  const values = {
    title,
    occurredOn,
    description: String(formData.get("description") ?? "").trim() || null,
    category: String(formData.get("category") ?? "").trim() || "life",
    entryId: entryId && /^[0-9a-f-]{36}$/i.test(entryId) ? entryId : null,
  };

  const db = await getDb();

  if (id) {
    await db
      .update(milestones)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(milestones.id, id), eq(milestones.userId, user.id)));
  } else {
    await db.insert(milestones).values({ ...values, userId: user.id });
  }

  revalidatePath("/timeline");
  revalidatePath("/dashboard");
}

export async function deleteMilestoneAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("milestoneId") ?? "");
  if (!id) return;

  const db = await getDb();
  await db.delete(milestones).where(and(eq(milestones.id, id), eq(milestones.userId, user.id)));
  revalidatePath("/timeline");
}

/** Feeds the "attach an entry" dropdown on the timeline form. */
export async function listEntryOptionsAction(): Promise<Array<{ id: string; title: string }>> {
  const user = await requireUser();
  const db = await getDb();
  const rows = await db
    .select({ id: entries.id, title: entries.title })
    .from(entries)
    .where(eq(entries.userId, user.id))
    .orderBy(asc(entries.updatedAt));
  return rows;
}
