import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { chapters, entries, milestones, people, prompts, tags } from "@/db/schema";

/* ------------------------------------------------------------------ prompts */

export interface PromptWithState {
  id: string;
  slug: string;
  question: string;
  followUp: string | null;
  chapterSlug: string | null;
  answered: boolean;
  entryId: string | null;
}

export async function listPrompts(userId: string): Promise<PromptWithState[]> {
  const db = await getDb();

  const [promptRows, answerRows] = await Promise.all([
    db
      .select({
        id: prompts.id,
        slug: prompts.slug,
        question: prompts.question,
        followUp: prompts.followUp,
        chapterSlug: prompts.chapterSlug,
      })
      .from(prompts)
      .orderBy(asc(prompts.position), asc(prompts.category)),
    // Two queries instead of a correlated scalar subquery — see the note in
    // `listChaptersWithProgress` about unqualified column references.
    db
      .select({ promptId: entries.promptId, entryId: entries.id })
      .from(entries)
      .where(and(eq(entries.userId, userId), sql`${entries.promptId} is not null`)),
  ]);

  const answerByPrompt = new Map<string, string>();
  for (const row of answerRows) {
    if (row.promptId && !answerByPrompt.has(row.promptId)) answerByPrompt.set(row.promptId, row.entryId);
  }

  return promptRows.map((row) => {
    const entryId = answerByPrompt.get(row.id) ?? null;
    return { ...row, entryId, answered: Boolean(entryId) };
  });
}

export async function getPromptBySlug(slug: string): Promise<PromptWithState | null> {
  const db = await getDb();
  const [row] = await db.select().from(prompts).where(eq(prompts.slug, slug)).limit(1);
  if (!row) return null;
  return { ...row, answered: false, entryId: null };
}

/* ------------------------------------------------------------------- people */

export interface PersonWithCount {
  id: string;
  name: string;
  relationship: string | null;
  notes: string | null;
  avatarUrl: string | null;
  entryCount: number;
}

export async function listPeople(userId: string): Promise<PersonWithCount[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: people.id,
      name: people.name,
      relationship: people.relationship,
      notes: people.notes,
      avatarUrl: people.avatarUrl,
      entryCount: sql<number>`(
        select count(*)::int from ${sql.raw("entry_people")} ep
        join ${entries} e on e.id = ep.entry_id
        where ep.person_id = ${people.id} and e.user_id = ${userId}
      )`,
    })
    .from(people)
    .where(eq(people.userId, userId))
    .orderBy(
      desc(sql`(
      select count(*) from ${sql.raw("entry_people")} ep
      join ${entries} e on e.id = ep.entry_id
      where ep.person_id = ${people.id} and e.user_id = ${userId}
    )`),
      asc(people.name),
    );

  return rows as PersonWithCount[];
}

/* ---------------------------------------------------------------- timeline */

export interface TimelineEvent {
  id: string;
  kind: "milestone" | "entry";
  title: string;
  description: string | null;
  date: string;
  category: string | null;
  entryId: string | null;
  wordCount: number | null;
}

/**
 * The timeline merges dated entries with explicit milestones, newest last.
 *
 * Entries dated in the future are excluded — a writer mistyping a year should
 * not scramble the view.
 */
export async function listTimelineEvents(userId: string): Promise<TimelineEvent[]> {
  const db = await getDb();
  const today = new Date().toISOString().slice(0, 10);

  const [milestoneRows, entryRows] = await Promise.all([
    db
      .select({
        id: milestones.id,
        title: milestones.title,
        description: milestones.description,
        date: milestones.occurredOn,
        category: milestones.category,
        entryId: milestones.entryId,
      })
      .from(milestones)
      .where(and(eq(milestones.userId, userId), sql`${milestones.occurredOn} <= ${today}`))
      .orderBy(asc(milestones.occurredOn)),
    db
      .select({
        id: entries.id,
        title: entries.title,
        excerpt: entries.excerpt,
        date: entries.occurredAt,
        wordCount: entries.wordCount,
      })
      .from(entries)
      .where(
        and(
          eq(entries.userId, userId),
          sql`${entries.occurredAt} is not null`,
          sql`${entries.occurredAt} <= ${today}`,
        ),
      )
      .orderBy(asc(entries.occurredAt)),
  ]);

  const events: TimelineEvent[] = [
    ...milestoneRows.map((row) => ({
      id: row.id,
      kind: "milestone" as const,
      title: row.title,
      description: row.description,
      date: row.date,
      category: row.category,
      entryId: row.entryId,
      wordCount: null,
    })),
    ...entryRows.map((row) => ({
      id: row.id,
      kind: "entry" as const,
      title: row.title,
      description: row.excerpt,
      date: row.date ?? "",
      category: null,
      entryId: row.id,
      wordCount: row.wordCount,
    })),
  ];

  return events.filter((event) => event.date).sort((a, b) => a.date.localeCompare(b.date));
}

/* -------------------------------------------------------------------- tags */

export interface TagWithCount {
  id: string;
  name: string;
  color: string;
  entryCount: number;
}

export async function listTags(userId: string): Promise<TagWithCount[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      entryCount: sql<number>`(
        select count(*)::int from ${sql.raw("entry_tags")} et
        join ${entries} e on e.id = et.entry_id
        where et.tag_id = ${tags.id} and e.user_id = ${userId}
      )`,
    })
    .from(tags)
    .where(eq(tags.userId, userId))
    .orderBy(asc(tags.name));

  return rows as TagWithCount[];
}

/* ----------------------------------------------------------------- chapters */

export async function getChapterBySlug(userId: string, slug: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(chapters)
    .where(and(eq(chapters.userId, userId), eq(chapters.slug, slug)))
    .limit(1);
  return row ?? null;
}
