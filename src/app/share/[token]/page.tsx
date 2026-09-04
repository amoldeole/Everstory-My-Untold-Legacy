import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { chapters, entries, users } from "@/db/schema";
import { safeRenderMarkdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";

/** Shared pages are private-ish: never let a search engine index them. */
export const robots = { index: false, follow: false };

async function loadSharedEntry(token: string) {
  const db = await getDb();
  const rows = await db
    .select({
      id: entries.id,
      title: entries.title,
      body: entries.body,
      excerpt: entries.excerpt,
      occurredAt: entries.occurredAt,
      location: entries.location,
      mood: entries.mood,
      wordCount: entries.wordCount,
      updatedAt: entries.updatedAt,
      chapterTitle: chapters.title,
      chapterEmoji: chapters.emoji,
      authorName: users.name,
    })
    .from(entries)
    .innerJoin(users, eq(users.id, entries.userId))
    .leftJoin(chapters, eq(chapters.id, entries.chapterId))
    .where(and(eq(entries.shareToken, token), eq(entries.shareEnabled, true)))
    .limit(1);

  return rows[0] ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const entry = await loadSharedEntry(token);
  if (!entry) return { title: "Shared memory" };
  return {
    title: entry.title,
    description: entry.excerpt ?? undefined,
    robots: { index: false, follow: false },
  };
}

export default async function SharedEntryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const entry = await loadSharedEntry(token);
  if (!entry) notFound();

  const html = safeRenderMarkdown(entry.body);

  return (
    <div className="min-h-dvh bg-parchment-100 dark:bg-[#100e0c]">
      <main className="mx-auto max-w-2xl px-5 py-14 sm:py-20">
        <p className="mb-8 font-mono text-[11px] tracking-widest text-brass-600 uppercase dark:text-brass-300">
          {entry.chapterEmoji ?? "📄"} {entry.chapterTitle ?? "A shared memory"}
        </p>

        <h1 className="font-serif text-4xl leading-tight font-semibold tracking-tight text-ink-900 text-balance dark:text-parchment-50">
          {entry.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-500 dark:text-parchment-500">
          <span>{entry.authorName}</span>
          {entry.occurredAt ? <span>· {entry.occurredAt}</span> : null}
          {entry.location ? <span>· {entry.location}</span> : null}
          {entry.mood ? <span>· {entry.mood}</span> : null}
          <span>· {entry.wordCount.toLocaleString()} words</span>
        </div>

        <hr className="my-8 border-parchment-300 dark:border-white/10" />

        {html ? (
          <article className="prose-memoir" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <p className="text-ink-500 italic dark:text-parchment-400">This memory has no text yet.</p>
        )}

        <footer className="mt-14 border-t border-parchment-300 pt-6 dark:border-white/10">
          <p className="text-[13px] text-ink-500 dark:text-parchment-500">
            Shared from{" "}
            <Link
              href="/"
              className="font-medium text-brass-600 underline underline-offset-4 dark:text-brass-300"
            >
              Everstory
            </Link>{" "}
            — a private place to write the story only you can tell.
          </p>
        </footer>
      </main>
    </div>
  );
}
