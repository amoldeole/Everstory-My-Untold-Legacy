import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card, CardHeader, PageHeader } from "@/components/ui/Primitives";
import { SparkIcon } from "@/components/layout/NavIcons";
import { requireUser } from "@/lib/auth/session";
import { createEntryAction } from "@/server/actions/entries";
import { listChaptersWithProgress } from "@/server/queries/entries";

export const metadata: Metadata = { title: "Write" };

export default async function WritePage() {
  const user = await requireUser();
  const chapters = await listChaptersWithProgress(user.id);
  const untouched = chapters.filter((chapter) => chapter.entryCount === 0);

  return (
    <>
      <PageHeader
        eyebrow="New entry"
        title="What would you like to write?"
        description="Start with a blank page, or let one of these chapters prompt you. You can always move things around later."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-serif text-xl font-semibold text-ink-900 dark:text-parchment-50">
              A blank page
            </h2>
            <p className="mt-1.5 text-sm text-ink-600 dark:text-parchment-400">
              Nothing planned, nothing prompted. Just start typing.
            </p>
            <form action={createEntryAction} className="mt-4">
              <Button type="submit">Start writing</Button>
            </form>
          </Card>

          <Card>
            <CardHeader
              title="Or begin in a chapter"
              description={
                untouched.length > 0 ? "Chapters you have not written in yet" : "All of your chapters"
              }
            />
            <ul className="grid gap-px bg-parchment-300 sm:grid-cols-2 dark:bg-white/8">
              {(untouched.length > 0 ? untouched : chapters).map((chapter) => (
                <li key={chapter.id} className="bg-parchment-50 p-4 dark:bg-[#151211]">
                  <div className="flex items-start gap-3">
                    <span aria-hidden="true" className="text-xl leading-none">
                      {chapter.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink-900 dark:text-parchment-50">
                        {chapter.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[13px] text-ink-500 dark:text-parchment-400">
                        {chapter.description ?? "No description"}
                      </p>
                      <form action={createEntryAction} className="mt-2.5">
                        <input type="hidden" name="chapterSlug" value={chapter.slug} />
                        <Button type="submit" variant="subtle" size="sm">
                          Write here
                        </Button>
                      </form>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <SparkIcon className="h-5 w-5 text-brass-500" />
            <h2 className="mt-3 font-serif text-lg font-semibold text-ink-900 dark:text-parchment-50">
              Stuck?
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600 dark:text-parchment-400">
              The prompt library has ninety questions, organised by chapter. Pick one and the first sentence
              is already written for you.
            </p>
            <Link
              href="/prompts"
              className="mt-3 inline-block text-[13px] font-medium text-brass-600 underline underline-offset-4 dark:text-brass-300"
            >
              Browse the prompts →
            </Link>
          </Card>

          <Card className="p-5">
            <h2 className="font-serif text-lg font-semibold text-ink-900 dark:text-parchment-50">
              On writing
            </h2>
            <blockquote className="mt-2 border-l-2 border-brass-400 pl-3 text-[13px] leading-relaxed text-ink-600 italic dark:text-parchment-400">
              Write about what you can see. The feelings arrive attached to the objects.
            </blockquote>
            <p className="mt-3 text-[12px] text-ink-500 dark:text-parchment-500">
              Drafts save automatically. Nothing is published until you say so.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
