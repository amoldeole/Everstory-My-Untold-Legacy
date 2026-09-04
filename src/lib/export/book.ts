import "server-only";

import { and, asc, eq, inArray, type SQL } from "drizzle-orm";

import { getDb } from "@/db";
import {
  chapters,
  entries,
  entryPeople,
  entryTags,
  media,
  milestones,
  people,
  tags,
  users,
} from "@/db/schema";
import { renderMarkdown } from "@/lib/markdown";

export interface BookEntry {
  id: string;
  title: string;
  body: string;
  html: string;
  excerpt: string | null;
  occurredAt: string | null;
  location: string | null;
  mood: string | null;
  wordCount: number;
  status: "draft" | "published";
  visibility: "private" | "shared" | "legacy";
  tags: string[];
  people: string[];
  photos: Array<{
    id: string;
    filename: string;
    altText: string | null;
    mimeType: string;
    storageKey: string;
  }>;
}

export interface BookChapter {
  id: string | null;
  title: string;
  emoji: string;
  description: string | null;
  position: number;
  entries: BookEntry[];
  wordCount: number;
}

export interface Book {
  title: string;
  author: string;
  subtitle: string | null;
  generatedAt: Date;
  chapters: BookChapter[];
  milestones: Array<{ title: string; occurredOn: string; description: string | null; category: string }>;
  people: Array<{ name: string; relationship: string | null; notes: string | null }>;
  totals: { entries: number; words: number; photos: number; chapters: number };
}

export interface ExportOptions {
  includeDrafts: boolean;
  includePrivate: boolean;
  chapterSlugs?: string[];
  title?: string;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  includeDrafts: true,
  includePrivate: true,
};

/**
 * Assembles the memoir into a format-neutral structure.
 *
 * Every renderer consumes this, so Markdown, HTML, JSON and EPUB can never
 * drift apart in what they include.
 */
export async function buildBook(
  userId: string,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS,
): Promise<Book> {
  const db = await getDb();

  const userRows = await db
    .select({ name: users.name, bio: users.bio })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const user = userRows[0];

  const chapterRows = await db
    .select()
    .from(chapters)
    .where(eq(chapters.userId, userId))
    .orderBy(asc(chapters.position), asc(chapters.title));

  const conditions: SQL[] = [eq(entries.userId, userId)];
  if (!options.includeDrafts) conditions.push(eq(entries.status, "published"));
  if (!options.includePrivate) conditions.push(eq(entries.visibility, "shared"));

  const entryRows = await db
    .select()
    .from(entries)
    .where(and(...conditions))
    .orderBy(asc(entries.occurredAt), asc(entries.createdAt));

  const entryIds = entryRows.map((row) => row.id);

  const [tagRows, personRows, photoRows, milestoneRows, peopleRows] = await Promise.all([
    entryIds.length > 0
      ? db
          .select({ entryId: entryTags.entryId, name: tags.name })
          .from(entryTags)
          .innerJoin(tags, eq(tags.id, entryTags.tagId))
          .where(inArray(entryTags.entryId, entryIds))
      : Promise.resolve([]),
    entryIds.length > 0
      ? db
          .select({ entryId: entryPeople.entryId, name: people.name })
          .from(entryPeople)
          .innerJoin(people, eq(people.id, entryPeople.personId))
          .where(inArray(entryPeople.entryId, entryIds))
      : Promise.resolve([]),
    db.select().from(media).where(eq(media.userId, userId)),
    db
      .select({
        title: milestones.title,
        occurredOn: milestones.occurredOn,
        description: milestones.description,
        category: milestones.category,
      })
      .from(milestones)
      .where(eq(milestones.userId, userId))
      .orderBy(asc(milestones.occurredOn)),
    db
      .select({ name: people.name, relationship: people.relationship, notes: people.notes })
      .from(people)
      .where(eq(people.userId, userId))
      .orderBy(asc(people.name)),
  ]);

  const groupBy = <T extends { entryId: string; name: string }>(rows: T[]): Map<string, string[]> => {
    const map = new Map<string, string[]>();
    for (const row of rows) {
      map.set(row.entryId, [...(map.get(row.entryId) ?? []), row.name]);
    }
    return map;
  };

  const tagsByEntry = groupBy(tagRows);
  const peopleByEntry = groupBy(personRows);

  const photosByEntry = new Map<string, BookEntry["photos"]>();
  for (const row of photoRows) {
    if (!row.entryId) continue;
    photosByEntry.set(row.entryId, [
      ...(photosByEntry.get(row.entryId) ?? []),
      {
        id: row.id,
        filename: row.filename,
        altText: row.altText,
        mimeType: row.mimeType,
        storageKey: row.storageKey,
      },
    ]);
  }

  const bookEntries: BookEntry[] = entryRows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    html: renderMarkdown(row.body),
    excerpt: row.excerpt,
    occurredAt: row.occurredAt,
    location: row.location,
    mood: row.mood,
    wordCount: row.wordCount,
    status: row.status,
    visibility: row.visibility,
    tags: tagsByEntry.get(row.id) ?? [],
    people: peopleByEntry.get(row.id) ?? [],
    photos: photosByEntry.get(row.id) ?? [],
  }));

  const allowedSlugs = options.chapterSlugs?.length ? new Set(options.chapterSlugs) : null;

  const bookChapters: BookChapter[] = chapterRows
    .filter((chapter) => (allowedSlugs ? allowedSlugs.has(chapter.slug) : true))
    .map((chapter) => {
      const inChapter = bookEntries.filter((entry) => {
        const source = entryRows.find((row) => row.id === entry.id);
        return source?.chapterId === chapter.id;
      });
      return {
        id: chapter.id,
        title: chapter.title,
        emoji: chapter.emoji,
        description: chapter.description,
        position: chapter.position,
        entries: inChapter,
        wordCount: inChapter.reduce((sum, entry) => sum + entry.wordCount, 0),
      };
    });

  // Entries with no chapter still deserve a home in the export.
  const assigned = new Set(bookChapters.flatMap((chapter) => chapter.entries.map((entry) => entry.id)));
  const unassigned = bookEntries.filter((entry) => !assigned.has(entry.id));

  if (unassigned.length > 0) {
    bookChapters.push({
      id: null,
      title: "Unsorted memories",
      emoji: "🗂️",
      description: "Entries that are not in a chapter yet",
      position: Number.MAX_SAFE_INTEGER,
      entries: unassigned,
      wordCount: unassigned.reduce((sum, entry) => sum + entry.wordCount, 0),
    });
  }

  // Drop empty chapters from the export — nobody wants six blank sections.
  const usedChapters = bookChapters.filter((chapter) => chapter.entries.length > 0);

  return {
    title: options.title?.trim() || `${user?.name ?? "My"}'s Everstory`,
    author: user?.name ?? "Anonymous",
    subtitle: user?.bio ?? null,
    generatedAt: new Date(),
    chapters: usedChapters,
    milestones: milestoneRows,
    people: peopleRows,
    totals: {
      entries: bookEntries.length,
      words: bookEntries.reduce((sum, entry) => sum + entry.wordCount, 0),
      photos: photoRows.length,
      chapters: usedChapters.length,
    },
  };
}
