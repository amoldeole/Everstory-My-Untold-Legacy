import "server-only";

import { and, asc, count, desc, eq, gte, ilike, inArray, or, sql, type SQL } from "drizzle-orm";

import { getDb, type Database } from "@/db";
import {
  chapters,
  entries,
  entryPeople,
  entryTags,
  media,
  milestones,
  people,
  prompts,
  tags,
} from "@/db/schema";
import type { EntryStatus, EntryVisibility } from "@/db/schema";

export interface EntryListFilters {
  userId: string;
  chapterId?: string;
  status?: EntryStatus;
  visibility?: EntryVisibility;
  search?: string;
  tagId?: string;
  limit?: number;
  offset?: number;
}

export interface EntryListItem {
  id: string;
  title: string;
  excerpt: string | null;
  status: EntryStatus;
  visibility: EntryVisibility;
  entryType: "chapter" | "memory" | "letter" | "prompt";
  mood: string | null;
  location: string | null;
  occurredAt: string | null;
  wordCount: number;
  pinned: boolean;
  shareEnabled: boolean;
  shareToken: string | null;
  createdAt: Date;
  updatedAt: Date;
  chapterId: string | null;
  chapterTitle: string | null;
  chapterEmoji: string | null;
  photoCount: number;
}

export async function listEntries(
  filters: EntryListFilters,
): Promise<{ items: EntryListItem[]; total: number }> {
  const db = await getDb();
  const conditions: SQL[] = [eq(entries.userId, filters.userId)];

  if (filters.chapterId) conditions.push(eq(entries.chapterId, filters.chapterId));
  if (filters.status) conditions.push(eq(entries.status, filters.status));
  if (filters.visibility) conditions.push(eq(entries.visibility, filters.visibility));

  if (filters.search && filters.search.trim()) {
    const needle = `%${filters.search.trim()}%`;
    const match = or(
      ilike(entries.title, needle),
      ilike(entries.body, needle),
      ilike(entries.location, needle),
    );
    if (match) conditions.push(match);
  }

  if (filters.tagId) {
    // A separate query rather than a correlated EXISTS: Drizzle renders
    // `${entries.id}` as a bare `"id"`, which inside a subquery binds to the
    // inner table instead of the outer one.
    const tagged = await db
      .select({ entryId: entryTags.entryId })
      .from(entryTags)
      .where(eq(entryTags.tagId, filters.tagId));

    const ids = tagged.map((row) => row.entryId);
    if (ids.length === 0) return { items: [], total: 0 };
    conditions.push(inArray(entries.id, ids));
  }

  const where = and(...conditions);

  const photoCountSubquery = sql<number>`(
    select count(*)::int from ${media} where ${media.entryId} = ${entries.id}
  )`;

  const rows = await db
    .select({
      id: entries.id,
      title: entries.title,
      excerpt: entries.excerpt,
      status: entries.status,
      visibility: entries.visibility,
      entryType: entries.entryType,
      mood: entries.mood,
      location: entries.location,
      occurredAt: entries.occurredAt,
      wordCount: entries.wordCount,
      pinned: entries.pinned,
      shareEnabled: entries.shareEnabled,
      shareToken: entries.shareToken,
      createdAt: entries.createdAt,
      updatedAt: entries.updatedAt,
      chapterId: chapters.id,
      chapterTitle: chapters.title,
      chapterEmoji: chapters.emoji,
      photoCount: photoCountSubquery,
    })
    .from(entries)
    .leftJoin(chapters, eq(chapters.id, entries.chapterId))
    .where(where)
    .orderBy(desc(entries.pinned), desc(entries.updatedAt))
    .limit(filters.limit ?? 50)
    .offset(filters.offset ?? 0);

  const totals = await db.select({ value: count() }).from(entries).where(where);

  return { items: rows as EntryListItem[], total: Number(totals[0]?.value ?? 0) };
}

export interface EntryDetail extends EntryListItem {
  body: string;
  promptId: string | null;
  promptQuestion: string | null;
  promptFollowUp: string | null;
  tags: Array<{ id: string; name: string; color: string }>;
  people: Array<{ id: string; name: string; relationship: string | null }>;
  photos: Array<{ id: string; altText: string | null; filename: string }>;
  milestone: { id: string; title: string; occurredOn: string; category: string } | null;
}

export async function getEntry(userId: string, entryId: string): Promise<EntryDetail | null> {
  const db = await getDb();

  const [row] = await db
    .select({
      id: entries.id,
      title: entries.title,
      body: entries.body,
      excerpt: entries.excerpt,
      status: entries.status,
      visibility: entries.visibility,
      entryType: entries.entryType,
      mood: entries.mood,
      location: entries.location,
      occurredAt: entries.occurredAt,
      wordCount: entries.wordCount,
      pinned: entries.pinned,
      shareEnabled: entries.shareEnabled,
      shareToken: entries.shareToken,
      createdAt: entries.createdAt,
      updatedAt: entries.updatedAt,
      chapterId: entries.chapterId,
      promptId: entries.promptId,
      chapterTitle: chapters.title,
      chapterEmoji: chapters.emoji,
      promptQuestion: prompts.question,
      promptFollowUp: prompts.followUp,
    })
    .from(entries)
    .leftJoin(chapters, eq(chapters.id, entries.chapterId))
    .leftJoin(prompts, eq(prompts.id, entries.promptId))
    .where(and(eq(entries.id, entryId), eq(entries.userId, userId)))
    .limit(1);

  if (!row) return null;

  const [tagRows, personRows, photoRows, milestoneRows] = await Promise.all([
    db
      .select({ id: tags.id, name: tags.name, color: tags.color })
      .from(entryTags)
      .innerJoin(tags, eq(tags.id, entryTags.tagId))
      .where(eq(entryTags.entryId, entryId))
      .orderBy(asc(tags.name)),
    db
      .select({ id: people.id, name: people.name, relationship: people.relationship })
      .from(entryPeople)
      .innerJoin(people, eq(people.id, entryPeople.personId))
      .where(eq(entryPeople.entryId, entryId))
      .orderBy(asc(people.name)),
    db
      .select({ id: media.id, altText: media.altText, filename: media.filename })
      .from(media)
      .where(eq(media.entryId, entryId))
      .orderBy(asc(media.createdAt)),
    db
      .select({
        id: milestones.id,
        title: milestones.title,
        occurredOn: milestones.occurredOn,
        category: milestones.category,
      })
      .from(milestones)
      .where(and(eq(milestones.entryId, entryId), eq(milestones.userId, userId)))
      .limit(1),
  ]);

  return {
    ...row,
    photoCount: photoRows.length,
    tags: tagRows,
    people: personRows,
    photos: photoRows,
    milestone: milestoneRows[0] ?? null,
  } satisfies EntryDetail;
}

export interface ChapterWithProgress {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  emoji: string;
  position: number;
  entryCount: number;
  wordCount: number;
  lastUpdatedAt: Date | null;
}

export async function listChaptersWithProgress(userId: string): Promise<ChapterWithProgress[]> {
  const db = await getDb();

  // Aggregated with a LEFT JOIN rather than correlated subqueries: Drizzle
  // renders `${chapters.id}` as a bare `"id"`, which inside a subquery binds
  // to `entries` instead of `chapters` and silently returns zero.
  const rows = await db
    .select({
      id: chapters.id,
      slug: chapters.slug,
      title: chapters.title,
      description: chapters.description,
      emoji: chapters.emoji,
      position: chapters.position,
      entryCount: sql<number>`count(${entries.id})::int`,
      wordCount: sql<number>`coalesce(sum(${entries.wordCount}), 0)::int`,
      lastUpdatedAt: sql<Date | null>`max(${entries.updatedAt})`,
    })
    .from(chapters)
    .leftJoin(entries, and(eq(entries.chapterId, chapters.id), eq(entries.userId, userId)))
    .where(eq(chapters.userId, userId))
    .groupBy(chapters.id)
    .orderBy(asc(chapters.position), asc(chapters.title));

  return rows as ChapterWithProgress[];
}

/** Entries updated in the last `days` days, grouped by calendar day. */
export async function getRecentActivityDays(userId: string, days: number): Promise<Set<string>> {
  const db = await getDb();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({ day: sql<string>`to_char(${entries.updatedAt}, 'YYYY-MM-DD')` })
    .from(entries)
    .where(and(eq(entries.userId, userId), gte(entries.updatedAt, since)));

  return new Set(rows.map((row) => row.day));
}

export function currentStreak(activeDays: Set<string>): number {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const today = new Date();
  let streak = 0;

  for (let offset = 0; offset < 400; offset += 1) {
    const day = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offset));
    const key = formatter.format(day);
    if (activeDays.has(key)) {
      streak += 1;
      continue;
    }
    // A streak survives a single quiet day that has not finished yet.
    if (offset === 0) continue;
    break;
  }

  return streak;
}

export async function countEntriesSince(db: Database, userId: string, since: Date): Promise<number> {
  const rows = await db
    .select({ value: count() })
    .from(entries)
    .where(and(eq(entries.userId, userId), gte(entries.updatedAt, since)));
  return Number(rows[0]?.value ?? 0);
}

export async function sumWordsSince(db: Database, userId: string, since: Date): Promise<number> {
  const rows = await db
    .select({ value: sql<number>`coalesce(sum(${entries.wordCount}), 0)::int` })
    .from(entries)
    .where(and(eq(entries.userId, userId), gte(entries.updatedAt, since)));
  return Number(rows[0]?.value ?? 0);
}
