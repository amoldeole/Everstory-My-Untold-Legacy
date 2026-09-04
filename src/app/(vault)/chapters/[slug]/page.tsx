import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/Primitives";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PenIcon } from "@/components/layout/NavIcons";
import { requireUser } from "@/lib/auth/session";
import { getChapterBySlug } from "@/server/queries/library";
import { listEntries } from "@/server/queries/entries";
import { deleteChapterAction, updateChapterAction } from "@/server/actions/library";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const user = await requireUser();
  const chapter = await getChapterBySlug(user.id, slug);
  return { title: chapter?.title ?? "Chapter" };
}

export default async function ChapterDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser();

  const chapter = await getChapterBySlug(user.id, slug);
  if (!chapter) notFound();

  const { items, total } = await listEntries({ userId: user.id, chapterId: chapter.id, limit: 200 });
  const words = items.reduce((sum, entry) => sum + entry.wordCount, 0);

  return (
    <>
      <PageHeader
        eyebrow="Chapter"
        title={`${chapter.emoji} ${chapter.title}`}
        description={chapter.description ?? undefined}
        action={
          <ButtonLink href={`/write?chapter=${chapter.slug}`}>
            <PenIcon className="h-4 w-4" />
            Write here
          </ButtonLink>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          {items.length === 0 ? (
            <EmptyState
              icon={<span className="text-3xl">{chapter.emoji}</span>}
              title="Nothing in this chapter yet"
              description="Answer one of the prompts below, or start from a blank page."
              action={
                <ButtonLink href="/prompts" variant="secondary">
                  Browse prompts
                </ButtonLink>
              }
            />
          ) : (
            <ul className="space-y-3">
              {items.map((entry) => (
                <li key={entry.id}>
                  <Card className="transition hover:shadow-lift">
                    <Link href={`/write/${entry.id}`} className="block p-5">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate font-serif text-lg font-semibold text-ink-900 dark:text-parchment-50">
                          {entry.title}
                        </h2>
                        {entry.status === "draft" ? <Badge tone="amber">Draft</Badge> : null}
                      </div>
                      {entry.excerpt ? (
                        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-600 dark:text-parchment-400">
                          {entry.excerpt}
                        </p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-x-3 text-[12px] text-ink-500 dark:text-parchment-500">
                        {entry.occurredAt ? <span>{entry.occurredAt}</span> : null}
                        {entry.location ? <span>{entry.location}</span> : null}
                        <span>{entry.wordCount.toLocaleString()} words</span>
                        <span>edited {formatDistanceToNow(entry.updatedAt, { addSuffix: true })}</span>
                      </div>
                    </Link>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-[11px] tracking-widest text-ink-500 uppercase dark:text-parchment-500">
              In this chapter
            </p>
            <p className="mt-1 font-serif text-2xl font-semibold text-ink-900 dark:text-parchment-50">
              {words.toLocaleString()}
            </p>
            <p className="text-[13px] text-ink-500 dark:text-parchment-500">
              words across {total} {total === 1 ? "entry" : "entries"}
            </p>
          </Card>

          <Card>
            <CardHeader title="Edit chapter" />
            <form action={updateChapterAction} className="space-y-3 p-4">
              <input type="hidden" name="chapterId" value={chapter.id} />
              <input
                name="title"
                defaultValue={chapter.title}
                required
                maxLength={80}
                className="h-9 w-full rounded-lg border border-parchment-400 bg-parchment-50 px-3 text-[13px] text-ink-900 dark:border-white/12 dark:bg-white/5 dark:text-parchment-50"
              />
              <textarea
                name="description"
                defaultValue={chapter.description ?? ""}
                rows={3}
                maxLength={280}
                placeholder="Description"
                className="w-full rounded-lg border border-parchment-400 bg-parchment-50 px-3 py-2 text-[13px] text-ink-900 dark:border-white/12 dark:bg-white/5 dark:text-parchment-50"
              />
              <input
                name="emoji"
                defaultValue={chapter.emoji}
                maxLength={4}
                className="h-9 w-full rounded-lg border border-parchment-400 bg-parchment-50 px-3 text-[13px] text-ink-900 dark:border-white/12 dark:bg-white/5 dark:text-parchment-50"
              />
              <Button type="submit" size="sm" className="w-full">
                Save changes
              </Button>
            </form>
          </Card>

          <Card className="p-4">
            <p className="text-[13px] text-ink-600 dark:text-parchment-300">
              Deleting a chapter keeps its entries — they move to “no chapter”.
            </p>
            <form action={deleteChapterAction} className="mt-3">
              <input type="hidden" name="chapterId" value={chapter.id} />
              <Button type="submit" variant="danger" size="sm" className="w-full">
                Delete chapter
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
