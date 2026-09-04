import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardHeader, PageHeader } from "@/components/ui/Primitives";
import { Button } from "@/components/ui/Button";
import { requireUser } from "@/lib/auth/session";
import { listChaptersWithProgress } from "@/server/queries/entries";
import { createChapterAction, restoreDefaultChaptersAction } from "@/server/actions/library";
import { DEFAULT_CHAPTERS } from "@/lib/catalog/chapters";

export const metadata: Metadata = { title: "Chapters" };
export const dynamic = "force-dynamic";

const EMOJI_CHOICES = [
  "📖",
  "🌱",
  "🧸",
  "🏡",
  "🎒",
  "🌀",
  "🛠️",
  "💛",
  "🤝",
  "🗺️",
  "🌧️",
  "🎈",
  "⚖️",
  "☕",
  "🕯️",
  "✉️",
];

export default async function ChaptersPage() {
  const user = await requireUser();
  const chapters = await listChaptersWithProgress(user.id);

  const totalWords = chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0);
  const missingDefaults = DEFAULT_CHAPTERS.filter(
    (def) => !chapters.some((chapter) => chapter.slug === def.slug),
  );

  return (
    <>
      <PageHeader
        eyebrow="Structure"
        title="Chapters"
        description="The shape of your story. Rename, reorder, or delete anything — these are suggestions, not a template you have to live with."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {chapters.map((chapter) => {
              const pct = Math.min(100, Math.round((chapter.wordCount / 1200) * 100));
              return (
                <li key={chapter.id}>
                  <Card className="h-full p-5 transition hover:shadow-lift">
                    <Link href={`/chapters/${chapter.slug}`} className="block">
                      <div className="flex items-start gap-3">
                        <span aria-hidden="true" className="text-2xl leading-none">
                          {chapter.emoji}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h2 className="font-serif text-lg font-semibold text-ink-900 dark:text-parchment-50">
                            {chapter.title}
                          </h2>
                          <p className="mt-0.5 line-clamp-2 text-[13px] text-ink-500 dark:text-parchment-400">
                            {chapter.description ?? "No description"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-parchment-200 dark:bg-white/10">
                        <div className="h-full rounded-full bg-brass-400" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1.5 text-[12px] text-ink-500 dark:text-parchment-500">
                        {chapter.entryCount === 0
                          ? "Nothing written yet"
                          : `${chapter.entryCount} ${chapter.entryCount === 1 ? "entry" : "entries"} · ${chapter.wordCount.toLocaleString()} words`}
                      </p>
                    </Link>
                  </Card>
                </li>
              );
            })}
          </ul>

          {chapters.length === 0 ? (
            <p className="mt-4 text-sm text-ink-500 dark:text-parchment-500">
              No chapters yet. Restore the defaults or add your own.
            </p>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Add a chapter" description="Your own section" />
            <form action={createChapterAction} className="space-y-3 p-4">
              <input
                name="title"
                required
                maxLength={80}
                placeholder="Chapter title"
                className="h-9 w-full rounded-lg border border-parchment-400 bg-parchment-50 px-3 text-[13px] text-ink-900 dark:border-white/12 dark:bg-white/5 dark:text-parchment-50"
              />
              <textarea
                name="description"
                rows={2}
                maxLength={280}
                placeholder="Optional description"
                className="w-full rounded-lg border border-parchment-400 bg-parchment-50 px-3 py-2 text-[13px] text-ink-900 dark:border-white/12 dark:bg-white/5 dark:text-parchment-50"
              />
              <div>
                <label
                  htmlFor="emoji"
                  className="mb-1 block text-[12px] font-medium text-ink-600 dark:text-parchment-300"
                >
                  Icon
                </label>
                <select
                  id="emoji"
                  name="emoji"
                  defaultValue="📖"
                  className="h-9 w-full rounded-lg border border-parchment-400 bg-parchment-50 px-3 text-[13px] dark:border-white/12 dark:bg-white/5 dark:text-parchment-50"
                >
                  {EMOJI_CHOICES.map((emoji) => (
                    <option key={emoji} value={emoji}>
                      {emoji}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" size="sm" className="w-full">
                Add chapter
              </Button>
            </form>
          </Card>

          {missingDefaults.length > 0 ? (
            <Card className="p-4">
              <p className="text-[13px] text-ink-600 dark:text-parchment-300">
                {missingDefaults.length} default{" "}
                {missingDefaults.length === 1 ? "chapter is" : "chapters are"} missing.
              </p>
              <form action={restoreDefaultChaptersAction} className="mt-3">
                <Button type="submit" variant="secondary" size="sm" className="w-full">
                  Restore defaults
                </Button>
              </form>
            </Card>
          ) : null}

          <Card className="p-4">
            <p className="text-[11px] tracking-widest text-ink-500 uppercase dark:text-parchment-500">
              Total
            </p>
            <p className="mt-1 font-serif text-2xl font-semibold text-ink-900 dark:text-parchment-50">
              {totalWords.toLocaleString()}
            </p>
            <p className="text-[13px] text-ink-500 dark:text-parchment-500">words across all chapters</p>
          </Card>
        </div>
      </div>
    </>
  );
}
