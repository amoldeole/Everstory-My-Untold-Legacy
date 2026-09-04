import type { Metadata } from "next";
import Link from "next/link";

import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/Primitives";
import { Button } from "@/components/ui/Button";
import { DEFAULT_CHAPTERS } from "@/lib/catalog/chapters";
import { requireUser } from "@/lib/auth/session";
import { listPrompts } from "@/server/queries/library";
import { createEntryAction } from "@/server/actions/entries";

export const metadata: Metadata = { title: "Prompts" };
export const dynamic = "force-dynamic";

export default async function PromptsPage({
  searchParams,
}: {
  searchParams: Promise<{ chapter?: string; answered?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const all = await listPrompts(user.id);

  const answered = all.filter((prompt) => prompt.answered).length;
  const chapterFilter = params.chapter && params.chapter !== "all" ? params.chapter : null;
  const showAnswered = params.answered === "answered";
  const hideAnswered = params.answered === "unanswered";

  const filtered = all.filter((prompt) => {
    if (chapterFilter && prompt.chapterSlug !== chapterFilter) return false;
    if (showAnswered && !prompt.answered) return false;
    if (hideAnswered && prompt.answered) return false;
    return true;
  });

  const chapterMeta = new Map(DEFAULT_CHAPTERS.map((chapter) => [chapter.slug, chapter]));
  const byChapter = new Map<string | null, typeof filtered>();
  for (const prompt of filtered) {
    const key = prompt.chapterSlug;
    const list = byChapter.get(key) ?? [];
    list.push(prompt);
    byChapter.set(key, list);
  }

  const filterHref = (next: Partial<{ chapter: string; answered: string }>) => {
    const query = new URLSearchParams();
    const chapter = next.chapter ?? params.chapter ?? "all";
    const answeredFilter = next.answered ?? params.answered ?? "all";
    if (chapter !== "all") query.set("chapter", chapter);
    if (answeredFilter !== "all") query.set("answered", answeredFilter);
    const qs = query.toString();
    return qs ? `/prompts?${qs}` : "/prompts";
  };

  return (
    <>
      <PageHeader
        eyebrow="Ninety questions"
        title="Prompts"
        description="Answer them in any order. A prompt is a door, not an assignment — if it does not open onto anything, skip it."
      />

      <Card className="mb-6 flex flex-wrap items-center gap-3 p-4">
        <div className="flex-1">
          <p className="text-sm text-ink-700 dark:text-parchment-200">
            <span className="font-semibold">{answered}</span> of {all.length} answered
          </p>
          <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-parchment-200 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-brass-500"
              style={{ width: `${Math.round((answered / Math.max(1, all.length)) * 100)}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { href: filterHref({ answered: "all" }), label: "All", active: !params.answered },
            {
              href: filterHref({ answered: "unanswered" }),
              label: "Unanswered",
              active: params.answered === "unanswered",
            },
            {
              href: filterHref({ answered: "answered" }),
              label: "Answered",
              active: params.answered === "answered",
            },
          ].map((option) => (
            <Link
              key={option.label}
              href={option.href}
              className={
                option.active
                  ? "rounded-full bg-ink-900 px-3 py-1 text-[12px] font-medium text-parchment-50 dark:bg-parchment-100 dark:text-ink-900"
                  : "rounded-full bg-parchment-200 px-3 py-1 text-[12px] text-ink-700 transition hover:bg-parchment-300 dark:bg-white/10 dark:text-parchment-200 dark:hover:bg-white/15"
              }
            >
              {option.label}
            </Link>
          ))}
        </div>
      </Card>

      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href={filterHref({ chapter: "all" })}
          className={
            !chapterFilter
              ? "rounded-full bg-brass-300/60 px-3 py-1 text-[12px] font-medium text-brass-700 dark:bg-brass-700/30 dark:text-brass-300"
              : "rounded-full bg-parchment-200 px-3 py-1 text-[12px] text-ink-700 transition hover:bg-parchment-300 dark:bg-white/10 dark:text-parchment-200 dark:hover:bg-white/15"
          }
        >
          Every chapter
        </Link>
        {DEFAULT_CHAPTERS.map((chapter) => (
          <Link
            key={chapter.slug}
            href={filterHref({ chapter: chapter.slug })}
            className={
              chapterFilter === chapter.slug
                ? "rounded-full bg-brass-300/60 px-3 py-1 text-[12px] font-medium text-brass-700 dark:bg-brass-700/30 dark:text-brass-300"
                : "rounded-full bg-parchment-200 px-3 py-1 text-[12px] text-ink-700 transition hover:bg-parchment-300 dark:bg-white/10 dark:text-parchment-200 dark:hover:bg-white/15"
            }
          >
            {chapter.emoji} {chapter.title}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-parchment-400 px-6 py-14 text-center text-sm text-ink-500 dark:border-white/15 dark:text-parchment-400">
          No prompts match that filter.
        </p>
      ) : (
        <div className="space-y-6">
          {Array.from(byChapter.entries()).map(([slug, prompts]) => {
            const meta = slug ? chapterMeta.get(slug) : null;
            return (
              <Card key={slug ?? "orphans"}>
                <CardHeader
                  title={
                    <span className="flex items-center gap-2">
                      <span aria-hidden="true">{meta?.emoji ?? "💭"}</span>
                      {meta?.title ?? "Other prompts"}
                    </span>
                  }
                  description={`${prompts.length} ${prompts.length === 1 ? "prompt" : "prompts"}`}
                />
                <ul className="divide-y divide-parchment-300 dark:divide-white/8">
                  {prompts.map((prompt) => (
                    <li key={prompt.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] leading-relaxed text-ink-800 dark:text-parchment-100">
                            {prompt.question}
                          </p>
                          {prompt.followUp ? (
                            <p className="mt-1 text-[13px] italic text-ink-500 dark:text-parchment-400">
                              {prompt.followUp}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {prompt.answered ? (
                            <>
                              <Badge tone="green">Answered</Badge>
                              {prompt.entryId ? (
                                <Link
                                  href={`/write/${prompt.entryId}`}
                                  className="text-[13px] text-brass-600 underline underline-offset-4 dark:text-brass-300"
                                >
                                  Read it
                                </Link>
                              ) : null}
                            </>
                          ) : (
                            <form action={createEntryAction}>
                              <input type="hidden" name="promptSlug" value={prompt.slug} />
                              <Button type="submit" variant="secondary" size="sm">
                                Answer this
                              </Button>
                            </form>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
