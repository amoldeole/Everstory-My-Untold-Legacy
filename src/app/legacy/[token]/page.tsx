import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { chapters, entries, legacyContacts, users } from "@/db/schema";
import { safeRenderMarkdown } from "@/lib/markdown";
import { makeExcerpt } from "@/lib/utils/text";

export const dynamic = "force-dynamic";
export const robots = { index: false, follow: false };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const contact = await loadContact(token);
  return {
    title: contact ? `The legacy of ${contact.ownerName}` : "Legacy",
    robots: { index: false, follow: false },
  };
}

async function loadContact(token: string) {
  const db = await getDb();
  const rows = await db
    .select({
      id: legacyContacts.id,
      name: legacyContacts.name,
      userId: legacyContacts.userId,
      ownerName: users.name,
      ownerBio: users.bio,
    })
    .from(legacyContacts)
    .innerJoin(users, eq(users.id, legacyContacts.userId))
    .where(and(eq(legacyContacts.accessToken, token), isNull(legacyContacts.revokedAt)))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * A read-only view of everything the author marked "legacy".
 *
 * Deliberately plain: this page may be opened years from now, by someone
 * grieving, on whatever device they have. No JavaScript is required for it to
 * render, and the markup is as simple as we can make it.
 */
export default async function LegacyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const contact = await loadContact(token);
  if (!contact) notFound();

  const db = await getDb();
  const rows = await db
    .select({
      id: entries.id,
      title: entries.title,
      body: entries.body,
      excerpt: entries.excerpt,
      occurredAt: entries.occurredAt,
      location: entries.location,
      wordCount: entries.wordCount,
      updatedAt: entries.updatedAt,
      chapterTitle: chapters.title,
      chapterEmoji: chapters.emoji,
    })
    .from(entries)
    .leftJoin(chapters, eq(chapters.id, entries.chapterId))
    .where(and(eq(entries.userId, contact.userId), eq(entries.visibility, "legacy")))
    .orderBy(asc(entries.occurredAt), asc(entries.createdAt));

  return (
    <div className="min-h-dvh bg-parchment-100 dark:bg-[#100e0c]">
      <main className="mx-auto max-w-2xl px-5 py-14 sm:py-20">
        <p className="mb-8 font-mono text-[11px] tracking-widest text-brass-600 uppercase dark:text-brass-300">
          A legacy, left for {contact.name}
        </p>

        <h1 className="font-serif text-4xl leading-tight font-semibold tracking-tight text-ink-900 text-balance dark:text-parchment-50">
          The story of {contact.ownerName}
        </h1>

        {contact.ownerBio ? (
          <p className="mt-4 font-serif text-lg leading-relaxed text-ink-600 italic dark:text-parchment-400">
            {contact.ownerBio}
          </p>
        ) : null}

        <p className="mt-6 text-sm leading-relaxed text-ink-600 dark:text-parchment-400">
          These are the memories {contact.ownerName} chose to leave to you. Read them slowly.
        </p>

        <hr className="my-10 border-parchment-300 dark:border-white/10" />

        {rows.length === 0 ? (
          <p className="text-ink-500 italic dark:text-parchment-400">
            Nothing has been marked for legacy yet.
          </p>
        ) : (
          <div className="space-y-12">
            {rows.map((entry) => (
              <article key={entry.id} className="print-break-inside-avoid">
                <p className="mb-2 font-mono text-[11px] tracking-widest text-ink-400 uppercase dark:text-parchment-500">
                  {entry.chapterEmoji ?? "📄"} {entry.chapterTitle ?? "Memory"}
                  {entry.occurredAt ? ` · ${entry.occurredAt}` : ""}
                  {entry.location ? ` · ${entry.location}` : ""}
                </p>
                <h2 className="font-serif text-2xl font-semibold text-ink-900 dark:text-parchment-50">
                  {entry.title}
                </h2>
                <div
                  className="prose-memoir mt-3"
                  dangerouslySetInnerHTML={{ __html: safeRenderMarkdown(entry.body) }}
                />
                {entry.excerpt ? null : <p className="sr-only">{makeExcerpt(entry.body)}</p>}
              </article>
            ))}
          </div>
        )}

        <footer className="mt-16 border-t border-parchment-300 pt-6 dark:border-white/10">
          <p className="text-[13px] text-ink-500 dark:text-parchment-500">
            Preserved with{" "}
            <Link
              href="/"
              className="font-medium text-brass-600 underline underline-offset-4 dark:text-brass-300"
            >
              Everstory
            </Link>
            .
          </p>
        </footer>
      </main>
    </div>
  );
}
