import type { Metadata } from "next";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";

import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/Primitives";
import { ButtonLink } from "@/components/ui/Button";
import { PenIcon, SparkIcon } from "@/components/layout/NavIcons";
import { requireUser } from "@/lib/auth/session";
import { getDashboardData } from "@/server/queries/dashboard";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Dashboard" };

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card className="p-5">
      <p className="text-[11px] font-medium tracking-widest text-ink-500 uppercase dark:text-parchment-500">
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl leading-none font-semibold text-ink-900 dark:text-parchment-50">
        {value}
      </p>
      {sub ? <p className="mt-1.5 text-[13px] text-ink-500 dark:text-parchment-400">{sub}</p> : null}
    </Card>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id, user.preferences.writingGoalWords ?? 500);

  const goalPct = Math.min(100, Math.round((data.wordsThisWeek / Math.max(1, data.goalWords)) * 100));
  const firstName = user.name.split(" ")[0] ?? user.name;
  const activeChapters = data.chapters.filter((chapter) => chapter.entryCount > 0);

  return (
    <>
      <PageHeader
        eyebrow={format(new Date(), "EEEE, d MMMM yyyy")}
        title={`${greeting()}, ${firstName}`}
        description={
          data.totals.entries === 0
            ? "Your book is empty. That is the easiest kind of problem to fix — start with one memory."
            : `You have written ${data.totals.words.toLocaleString()} words across ${data.totals.entries} ${
                data.totals.entries === 1 ? "entry" : "entries"
              }.`
        }
        action={
          <ButtonLink href="/write">
            <PenIcon className="h-4 w-4" />
            Write something
          </ButtonLink>
        }
      />

      {/* ------------------------------------------------------------ stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Words"
          value={data.totals.words.toLocaleString()}
          sub={`${data.wordsThisWeek.toLocaleString()} this week`}
        />
        <Stat label="Entries" value={data.totals.entries} sub={`${data.writtenThisWeek} touched this week`} />
        <Stat
          label="Streak"
          value={data.streak === 1 ? "1 day" : `${data.streak} days`}
          sub={data.streak === 0 ? "Write today to start one" : "Keep it going"}
        />
        <Stat
          label="Chapters"
          value={`${activeChapters.length}/${data.chapters.length}`}
          sub="chapters with writing"
        />
      </div>

      {/* ------------------------------------------------------------ goal */}
      <Card className="mt-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink-800 dark:text-parchment-100">This week&apos;s goal</p>
            <p className="mt-0.5 text-[13px] text-ink-500 dark:text-parchment-400">
              {data.wordsThisWeek.toLocaleString()} of {data.goalWords.toLocaleString()} words
            </p>
          </div>
          <Link
            href="/settings"
            className="text-[13px] text-brass-600 underline underline-offset-4 dark:text-brass-300"
          >
            Change target
          </Link>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-parchment-200 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-brass-500 transition-[width] duration-500"
            style={{ width: `${goalPct}%` }}
          />
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* ------------------------------------------------------- continue */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Pick up where you left off"
              description="Most recently touched"
              action={
                <Link
                  href="/entries"
                  className="shrink-0 text-[13px] text-brass-600 underline underline-offset-4 dark:text-brass-300"
                >
                  All entries
                </Link>
              }
            />
            {data.recent.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={<PenIcon className="h-7 w-7" />}
                  title="No entries yet"
                  description="Answer one prompt. Ten minutes. That is all it takes to begin."
                  action={
                    <ButtonLink href="/prompts" variant="secondary">
                      <SparkIcon className="h-4 w-4" />
                      Browse prompts
                    </ButtonLink>
                  }
                />
              </div>
            ) : (
              <ul className="divide-y divide-parchment-300 dark:divide-white/8">
                {data.recent.map((entry) => (
                  <li key={entry.id}>
                    <Link
                      href={`/write/${entry.id}`}
                      className="flex items-start gap-3 px-5 py-3.5 transition hover:bg-parchment-200/50 dark:hover:bg-white/[0.03]"
                    >
                      <span aria-hidden="true" className="mt-0.5 text-lg leading-none">
                        {entry.chapterEmoji ?? "📄"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-ink-900 dark:text-parchment-50">
                            {entry.title}
                          </p>
                          {entry.status === "draft" ? <Badge tone="amber">Draft</Badge> : null}
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-[13px] text-ink-500 dark:text-parchment-400">
                          {entry.excerpt || "No preview yet"}
                        </p>
                        <p className="mt-1 text-[11px] text-ink-400 dark:text-parchment-500">
                          {entry.chapterTitle ? `${entry.chapterTitle} · ` : ""}
                          {entry.wordCount.toLocaleString()} words · edited{" "}
                          {formatDistanceToNow(entry.updatedAt, { addSuffix: true })}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* ----------------------------------------------------- chapters */}
          <Card className="mt-6">
            <CardHeader
              title="Your chapters"
              description="Progress across the shape of your story"
              action={
                <Link
                  href="/chapters"
                  className="shrink-0 text-[13px] text-brass-600 underline underline-offset-4 dark:text-brass-300"
                >
                  Manage
                </Link>
              }
            />
            <ul className="grid gap-px overflow-hidden rounded-b-xl bg-parchment-300 sm:grid-cols-2 dark:bg-white/8">
              {data.chapters.map((chapter) => {
                const pct = Math.min(100, Math.round((chapter.wordCount / 1200) * 100));
                return (
                  <li key={chapter.id} className="bg-parchment-50 p-4 dark:bg-[#151211]">
                    <Link href={`/chapters/${chapter.slug}`} className="group block">
                      <div className="flex items-center gap-2">
                        <span aria-hidden="true">{chapter.emoji}</span>
                        <p className="truncate text-sm font-medium text-ink-800 group-hover:text-brass-700 dark:text-parchment-100 dark:group-hover:text-brass-300">
                          {chapter.title}
                        </p>
                      </div>
                      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-parchment-200 dark:bg-white/10">
                        <div className="h-full rounded-full bg-brass-400" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1.5 text-[11px] text-ink-500 dark:text-parchment-500">
                        {chapter.entryCount === 0
                          ? "Nothing written yet"
                          : `${chapter.entryCount} ${chapter.entryCount === 1 ? "entry" : "entries"} · ${chapter.wordCount.toLocaleString()} words`}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        {/* -------------------------------------------------------- prompts */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Answer one of these" description="Unanswered, chosen at random" />
            <div className="divide-y divide-parchment-300 dark:divide-white/8">
              {data.nextPrompts.length === 0 ? (
                <p className="px-5 py-6 text-sm text-ink-500 dark:text-parchment-400">
                  You have answered every prompt in the library. That is remarkable.
                </p>
              ) : (
                data.nextPrompts.map((prompt) => (
                  <div key={prompt.id} className="px-5 py-4">
                    <p className="text-sm leading-relaxed text-ink-800 dark:text-parchment-100">
                      {prompt.question}
                    </p>
                    {prompt.followUp ? (
                      <p className="mt-1 text-[13px] italic text-ink-500 dark:text-parchment-400">
                        {prompt.followUp}
                      </p>
                    ) : null}
                    <ButtonLink
                      href={`/write?prompt=${prompt.slug}`}
                      variant="subtle"
                      size="sm"
                      className="mt-3"
                    >
                      Answer this
                    </ButtonLink>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Coming up" description="Anniversaries on your timeline" />
            {data.upcoming.length === 0 ? (
              <p className="px-5 py-6 text-sm text-ink-500 dark:text-parchment-400">
                No upcoming dates. Add milestones on the timeline to see them here.
              </p>
            ) : (
              <ul className="divide-y divide-parchment-300 dark:divide-white/8">
                {data.upcoming.map((milestone) => (
                  <li key={milestone.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brass-300/40 text-[11px] font-semibold text-brass-700 dark:bg-brass-700/25 dark:text-brass-300">
                      {format(new Date(`${milestone.occurredOn}T00:00:00Z`), "d MMM")}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink-800 dark:text-parchment-100">
                        {milestone.title}
                      </p>
                      <p className="text-[11px] text-ink-500 dark:text-parchment-500">
                        {format(new Date(`${milestone.occurredOn}T00:00:00Z`), "yyyy")} · {milestone.category}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <p className="font-serif text-lg leading-snug text-ink-800 dark:text-parchment-100">
              “{cn(data.streak > 2 ? "You are on a roll." : "Small, regular beats perfect.")}”
            </p>
            <p className="mt-2 text-[13px] text-ink-500 dark:text-parchment-400">
              {data.streak > 2
                ? `${data.streak} days in a row. Most people stop after two.`
                : "Ten minutes a day adds up to a book in a year."}
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
