import "server-only";

import { and, asc, desc, eq, gte, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { chapters, entries, media, milestones, prompts } from "@/db/schema";
import {
  countEntriesSince,
  currentStreak,
  getRecentActivityDays,
  listChaptersWithProgress,
  sumWordsSince,
} from "./entries";

export interface DashboardData {
  totals: {
    entries: number;
    words: number;
    chapters: number;
    photos: number;
    milestones: number;
  };
  streak: number;
  writtenThisWeek: number;
  wordsThisWeek: number;
  goalWords: number;
  chapters: Awaited<ReturnType<typeof listChaptersWithProgress>>;
  recent: Array<{
    id: string;
    title: string;
    excerpt: string | null;
    updatedAt: Date;
    wordCount: number;
    chapterEmoji: string | null;
    chapterTitle: string | null;
    status: "draft" | "published";
  }>;
  nextPrompts: Array<{
    id: string;
    slug: string;
    question: string;
    followUp: string | null;
    chapterSlug: string | null;
  }>;
  upcoming: Array<{ id: string; title: string; occurredOn: string; category: string }>;
}

export async function getDashboardData(userId: string, goalWords = 500): Promise<DashboardData> {
  const db = await getDb();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalsRows,
    recentRows,
    promptRows,
    milestoneRows,
    chapterRows,
    activeDays,
    writtenThisWeek,
    wordsThisWeek,
    photoRows,
  ] = await Promise.all([
    countTotals(db, userId),
    db
      .select({
        id: entries.id,
        title: entries.title,
        excerpt: entries.excerpt,
        updatedAt: entries.updatedAt,
        wordCount: entries.wordCount,
        status: entries.status,
        chapterEmoji: chapters.emoji,
        chapterTitle: chapters.title,
      })
      .from(entries)
      .leftJoin(chapters, eq(chapters.id, entries.chapterId))
      .where(eq(entries.userId, userId))
      .orderBy(desc(entries.updatedAt))
      .limit(6),
    db
      .select({
        id: prompts.id,
        slug: prompts.slug,
        question: prompts.question,
        followUp: prompts.followUp,
        chapterSlug: prompts.chapterSlug,
      })
      .from(prompts)
      .where(
        sql`not exists (
            select 1 from ${entries}
            where ${entries.userId} = ${userId} and ${entries.promptId} = ${prompts.id}
          )`,
      )
      .orderBy(asc(sql`random()`))
      .limit(3),
    db
      .select({
        id: milestones.id,
        title: milestones.title,
        occurredOn: milestones.occurredOn,
        category: milestones.category,
      })
      .from(milestones)
      .where(
        and(eq(milestones.userId, userId), gte(milestones.occurredOn, new Date().toISOString().slice(0, 10))),
      )
      .orderBy(asc(milestones.occurredOn))
      .limit(4),
    listChaptersWithProgress(userId),
    getRecentActivityDays(userId, 120),
    countEntriesSince(db, userId, weekAgo),
    sumWordsSince(db, userId, weekAgo),
    countPhotos(db, userId),
  ]);

  const totals = totalsRows;

  return {
    totals: {
      entries: Number(totals?.entries ?? 0),
      words: Number(totals?.words ?? 0),
      chapters: Number(totals?.chapters ?? 0),
      milestones: Number(totals?.milestones ?? 0),
      photos: photoRows,
    },
    streak: currentStreak(activeDays),
    writtenThisWeek,
    wordsThisWeek,
    goalWords,
    chapters: chapterRows,
    recent: recentRows as DashboardData["recent"],
    nextPrompts: promptRows,
    upcoming: milestoneRows,
  };
}

async function countTotals(
  db: Awaited<ReturnType<typeof getDb>>,
  userId: string,
): Promise<{ entries: number; words: number; chapters: number; milestones: number }> {
  const [entryRows, chapterRows, milestoneRows] = await Promise.all([
    db
      .select({
        entries: sql<number>`count(*)::int`,
        words: sql<number>`coalesce(sum(${entries.wordCount}), 0)::int`,
      })
      .from(entries)
      .where(eq(entries.userId, userId)),
    db
      .select({ chapters: sql<number>`count(*)::int` })
      .from(chapters)
      .where(eq(chapters.userId, userId)),
    db
      .select({ milestones: sql<number>`count(*)::int` })
      .from(milestones)
      .where(eq(milestones.userId, userId)),
  ]);

  return {
    entries: Number(entryRows[0]?.entries ?? 0),
    words: Number(entryRows[0]?.words ?? 0),
    chapters: Number(chapterRows[0]?.chapters ?? 0),
    milestones: Number(milestoneRows[0]?.milestones ?? 0),
  };
}

async function countPhotos(db: Awaited<ReturnType<typeof getDb>>, userId: string): Promise<number> {
  const rows = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(media)
    .where(eq(media.userId, userId));
  return Number(rows[0]?.value ?? 0);
}
