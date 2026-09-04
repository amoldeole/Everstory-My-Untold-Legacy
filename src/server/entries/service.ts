import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { chapters, entries, prompts } from "@/db/schema";
import { countWords, makeExcerpt } from "@/lib/utils/text";

/**
 * Entry business logic that is shared between Server Actions and Route
 * Handlers.
 *
 * This module must NOT have `"use server"`: a `"use server"` file may only
 * export async functions, and we export a Zod schema.
 */

export const entryPatchSchema = z.object({
  title: z.string().trim().max(200).optional(),
  body: z.string().max(400_000).optional(),
  chapterId: z.string().uuid().nullable().optional(),
  occurredAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.")
    .nullable()
    .optional(),
  location: z.string().trim().max(160).nullable().optional(),
  mood: z.string().trim().max(60).nullable().optional(),
  status: z.enum(["draft", "published"]).optional(),
  visibility: z.enum(["private", "shared", "legacy"]).optional(),
  pinned: z.boolean().optional(),
});

export type EntryPatch = z.infer<typeof entryPatchSchema>;

/** Applies a patch and keeps the derived fields (excerpt, word count) in sync. */
export async function applyEntryPatch(userId: string, entryId: string, patch: EntryPatch) {
  const db = await getDb();

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.title !== undefined) update.title = patch.title.length > 0 ? patch.title : "Untitled";
  if (patch.body !== undefined) {
    update.body = patch.body;
    update.wordCount = countWords(patch.body);
    update.excerpt = makeExcerpt(patch.body);
  }
  if (patch.chapterId !== undefined) update.chapterId = patch.chapterId;
  if (patch.occurredAt !== undefined) update.occurredAt = patch.occurredAt;
  if (patch.location !== undefined) update.location = patch.location;
  if (patch.mood !== undefined) update.mood = patch.mood;
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.visibility !== undefined) update.visibility = patch.visibility;
  if (patch.pinned !== undefined) update.pinned = patch.pinned;

  const updated = await db
    .update(entries)
    .set(update)
    .where(and(eq(entries.id, entryId), eq(entries.userId, userId)))
    .returning({ id: entries.id });

  return updated[0] ?? null;
}

export interface CreateEntryOptions {
  userId: string;
  promptSlug?: string | null;
  promptId?: string | null;
  chapterSlug?: string | null;
  chapterId?: string | null;
  title?: string | null;
}

/** Resolves a prompt and/or chapter, then creates the entry. */
export async function createEntryForUser(options: CreateEntryOptions): Promise<string> {
  const db = await getDb();

  let resolvedPromptId: string | null = options.promptId ?? null;
  let resolvedChapterId: string | null = options.chapterId ?? null;
  let title = options.title ?? "Untitled";

  if (!resolvedPromptId && options.promptSlug) {
    const [prompt] = await db
      .select({ id: prompts.id, question: prompts.question, chapterSlug: prompts.chapterSlug })
      .from(prompts)
      .where(eq(prompts.slug, options.promptSlug))
      .limit(1);

    if (prompt) {
      resolvedPromptId = prompt.id;
      if (!options.title) {
        title = prompt.question.length > 90 ? `${prompt.question.slice(0, 87)}…` : prompt.question;
      }
      if (!resolvedChapterId && prompt.chapterSlug) options = { ...options, chapterSlug: prompt.chapterSlug };
    }
  }

  if (!resolvedChapterId && options.chapterSlug) {
    const [chapter] = await db
      .select({ id: chapters.id })
      .from(chapters)
      .where(and(eq(chapters.slug, options.chapterSlug), eq(chapters.userId, options.userId)))
      .limit(1);
    resolvedChapterId = chapter?.id ?? null;
  }

  const [created] = await db
    .insert(entries)
    .values({
      userId: options.userId,
      title,
      body: "",
      promptId: resolvedPromptId,
      chapterId: resolvedChapterId,
      entryType: resolvedPromptId ? "prompt" : "memory",
    })
    .returning({ id: entries.id });

  if (!created) throw new Error("Could not create the entry");
  return created.id;
}
