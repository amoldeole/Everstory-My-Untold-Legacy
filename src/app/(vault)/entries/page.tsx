import type { Metadata } from "next";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/Primitives";
import { ButtonLink } from "@/components/ui/Button";
import { PenIcon } from "@/components/layout/NavIcons";
import { requireUser } from "@/lib/auth/session";
import { listEntries } from "@/server/queries/entries";
import { listChaptersWithProgress } from "@/server/queries/entries";
import type { EntryStatus, EntryVisibility } from "@/db/schema";

export const metadata: Metadata = { title: "All entries" };
export const dynamic = "force-dynamic";

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Any status" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Finished" },
];

const VISIBILITY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Any visibility" },
  { value: "private", label: "Only me" },
  { value: "shared", label: "Shared" },
  { value: "legacy", label: "Legacy" },
];

export default async function EntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; chapter?: string; status?: string; visibility?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const [{ items, total }, chapters] = await Promise.all([
    listEntries({
      userId: user.id,
      search: params.q,
      chapterId: params.chapter,
      status: (params.status || undefined) as EntryStatus | undefined,
      visibility: (params.visibility || undefined) as EntryVisibility | undefined,
      limit: 200,
    }),
    listChaptersWithProgress(user.id),
  ]);

  const activeFilter = Boolean(params.q || params.chapter || params.status || params.visibility);

  return (
    <>
      <PageHeader
        eyebrow="Library"
        title="All entries"
        description={
          total === 0
            ? "Nothing written yet."
            : `${total} ${total === 1 ? "entry" : "entries"}${activeFilter ? " matching your filters" : ""}.`
        }
        action={
          <ButtonLink href="/write">
            <PenIcon className="h-4 w-4" />
            New entry
          </ButtonLink>
        }
      />

      {/* Filters are a plain GET form so results are linkable and survive a refresh. */}
      <Card className="mb-6 p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="min-w-52 flex-1">
            <label
              htmlFor="q"
              className="mb-1 block text-[12px] font-medium text-ink-600 dark:text-parchment-300"
            >
              Search
            </label>
            <input
              id="q"
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Search titles, text and places"
              className="h-9 w-full rounded-lg border border-parchment-400 bg-parchment-50 px-3 text-[13px] text-ink-900 placeholder:text-ink-400 focus:border-brass-500 focus:outline-none dark:border-white/12 dark:bg-white/5 dark:text-parchment-50"
            />
          </div>

          <div>
            <label
              htmlFor="chapter"
              className="mb-1 block text-[12px] font-medium text-ink-600 dark:text-parchment-300"
            >
              Chapter
            </label>
            <select
              id="chapter"
              name="chapter"
              defaultValue={params.chapter ?? ""}
              className="h-9 rounded-lg border border-parchment-400 bg-parchment-50 px-3 text-[13px] text-ink-900 dark:border-white/12 dark:bg-white/5 dark:text-parchment-50"
            >
              <option value="">All chapters</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.emoji} {chapter.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="status"
              className="mb-1 block text-[12px] font-medium text-ink-600 dark:text-parchment-300"
            >
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={params.status ?? ""}
              className="h-9 rounded-lg border border-parchment-400 bg-parchment-50 px-3 text-[13px] text-ink-900 dark:border-white/12 dark:bg-white/5 dark:text-parchment-50"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="visibility"
              className="mb-1 block text-[12px] font-medium text-ink-600 dark:text-parchment-300"
            >
              Visibility
            </label>
            <select
              id="visibility"
              name="visibility"
              defaultValue={params.visibility ?? ""}
              className="h-9 rounded-lg border border-parchment-400 bg-parchment-50 px-3 text-[13px] text-ink-900 dark:border-white/12 dark:bg-white/5 dark:text-parchment-50"
            >
              {VISIBILITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="h-9 rounded-lg bg-ink-900 px-4 text-[13px] font-medium text-parchment-50 transition hover:bg-ink-700 dark:bg-parchment-100 dark:text-ink-900"
          >
            Filter
          </button>
          {activeFilter ? (
            <Link
              href="/entries"
              className="h-9 content-center rounded-lg px-3 text-[13px] text-ink-600 underline underline-offset-4 dark:text-parchment-300"
            >
              Clear
            </Link>
          ) : null}
        </form>
      </Card>

      {items.length === 0 ? (
        <EmptyState
          icon={<PenIcon className="h-7 w-7" />}
          title={activeFilter ? "No entries match those filters" : "Your library is empty"}
          description={
            activeFilter
              ? "Try widening the search or clearing the filters."
              : "Start with one memory. It does not have to be a good one."
          }
          action={<ButtonLink href="/write">{activeFilter ? "Clear filters" : "Write something"}</ButtonLink>}
        />
      ) : (
        <ul className="space-y-3">
          {items.map((entry) => (
            <li key={entry.id}>
              <Card className="transition hover:shadow-lift">
                <Link href={`/write/${entry.id}`} className="block p-5">
                  <div className="flex items-start gap-3">
                    <span aria-hidden="true" className="mt-0.5 text-xl leading-none">
                      {entry.chapterEmoji ?? "📄"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-serif text-lg font-semibold text-ink-900 dark:text-parchment-50">
                          {entry.title}
                        </h2>
                        {entry.pinned ? <Badge tone="brass">Pinned</Badge> : null}
                        {entry.status === "draft" ? (
                          <Badge tone="amber">Draft</Badge>
                        ) : (
                          <Badge tone="green">Finished</Badge>
                        )}
                        {entry.visibility === "shared" ? <Badge tone="blue">Shared</Badge> : null}
                        {entry.visibility === "legacy" ? <Badge tone="brass">Legacy</Badge> : null}
                      </div>

                      {entry.excerpt ? (
                        <p className="mt-1.5 line-clamp-2 max-w-3xl text-sm leading-relaxed text-ink-600 dark:text-parchment-400">
                          {entry.excerpt}
                        </p>
                      ) : null}

                      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-500 dark:text-parchment-500">
                        {entry.chapterTitle ? <span>{entry.chapterTitle}</span> : null}
                        {entry.occurredAt ? <span>{entry.occurredAt}</span> : null}
                        {entry.location ? <span>{entry.location}</span> : null}
                        {entry.mood ? <span className="italic">{entry.mood}</span> : null}
                        <span>{entry.wordCount.toLocaleString()} words</span>
                        {entry.photoCount > 0 ? <span>{entry.photoCount} photos</span> : null}
                        <span>edited {formatDistanceToNow(entry.updatedAt, { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
