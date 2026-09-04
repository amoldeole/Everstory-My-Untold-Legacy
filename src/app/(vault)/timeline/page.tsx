import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { format } from "date-fns";

import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/Primitives";
import { Button } from "@/components/ui/Button";
import { getDb } from "@/db";
import { entries } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { listTimelineEvents } from "@/server/queries/library";
import { deleteMilestoneAction, upsertMilestoneAction } from "@/server/actions/library";

export const metadata: Metadata = { title: "Timeline" };
export const dynamic = "force-dynamic";

const CATEGORIES = ["life", "family", "education", "work", "travel", "health", "home", "other"];

function eventHref(event: { kind: string; entryId: string | null }): string | null {
  return event.kind === "entry" || event.entryId ? `/write/${event.entryId}` : null;
}

export default async function TimelinePage() {
  const user = await requireUser();
  const [events, db] = await Promise.all([listTimelineEvents(user.id), getDb()]);

  const entryOptions = await db
    .select({ id: entries.id, title: entries.title })
    .from(entries)
    .where(eq(entries.userId, user.id))
    .orderBy(entries.title);

  const years = Array.from(new Set(events.map((event) => event.date.slice(0, 4)))).sort();

  return (
    <>
      <PageHeader
        eyebrow="Your life, in order"
        title="Timeline"
        description="Dated entries and milestones, earliest first. Add the big moments so the memories have somewhere to hang."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          {events.length === 0 ? (
            <EmptyState
              title="Nothing dated yet"
              description="Give an entry a date in the editor, or add a milestone here, and your timeline will start to fill in."
            />
          ) : (
            <div className="space-y-8">
              {years.map((year) => (
                <section key={year}>
                  <h2 className="mb-3 font-mono text-sm tracking-widest text-brass-600 dark:text-brass-300">
                    {year}
                  </h2>
                  <ol className="relative space-y-4 border-l border-parchment-400 pl-6 dark:border-white/12">
                    {events
                      .filter((event) => event.date.startsWith(year))
                      .map((event) => {
                        const href = eventHref(event);
                        const body = (
                          <>
                            <div className="flex flex-wrap items-baseline gap-2">
                              <h3 className="font-serif text-base font-semibold text-ink-900 dark:text-parchment-50">
                                {event.title}
                              </h3>
                              <span className="text-[12px] text-ink-500 dark:text-parchment-500">
                                {format(new Date(`${event.date}T00:00:00Z`), "d MMM yyyy")}
                              </span>
                              {event.category ? (
                                <span className="rounded-full bg-parchment-200 px-2 py-0.5 text-[11px] text-ink-600 dark:bg-white/10 dark:text-parchment-300">
                                  {event.category}
                                </span>
                              ) : null}
                            </div>
                            {event.description ? (
                              <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-600 dark:text-parchment-400">
                                {event.description}
                              </p>
                            ) : null}
                            {event.wordCount ? (
                              <p className="mt-1 text-[11px] text-ink-500 dark:text-parchment-500">
                                {event.wordCount.toLocaleString()} words
                              </p>
                            ) : null}
                          </>
                        );

                        return (
                          <li key={`${event.kind}-${event.id}`} className="relative">
                            <span
                              aria-hidden="true"
                              className={
                                event.kind === "milestone"
                                  ? "absolute top-1.5 -left-[1.9rem] h-3 w-3 rounded-full border-2 border-parchment-100 bg-brass-500 dark:border-[#100e0c]"
                                  : "absolute top-1.5 -left-[1.8rem] h-2.5 w-2.5 rounded-full border-2 border-parchment-100 bg-ink-400 dark:border-[#100e0c]"
                              }
                            />
                            {href ? (
                              <Link
                                href={href}
                                className="block rounded-lg p-3 transition hover:bg-parchment-200/50 dark:hover:bg-white/[0.03]"
                              >
                                {body}
                              </Link>
                            ) : (
                              <div className="p-3">{body}</div>
                            )}

                            {event.kind === "milestone" ? (
                              <form action={deleteMilestoneAction} className="mt-1 pl-3">
                                <input type="hidden" name="milestoneId" value={event.id} />
                                <button
                                  type="submit"
                                  className="text-[11px] text-ink-400 underline underline-offset-2 transition hover:text-seal-600 dark:text-parchment-500 dark:hover:text-seal-400"
                                >
                                  Remove
                                </button>
                              </form>
                            ) : null}
                          </li>
                        );
                      })}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </div>

        <div>
          <Card>
            <CardHeader title="Add a milestone" description="A dated moment in your life" />
            <form action={upsertMilestoneAction} className="space-y-3 p-4">
              <input
                name="title"
                required
                maxLength={120}
                placeholder="What happened?"
                className="h-9 w-full rounded-lg border border-parchment-400 bg-parchment-50 px-3 text-[13px] text-ink-900 dark:border-white/12 dark:bg-white/5 dark:text-parchment-50"
              />
              <input
                name="occurredOn"
                type="date"
                required
                className="h-9 w-full rounded-lg border border-parchment-400 bg-parchment-50 px-3 text-[13px] text-ink-900 dark:border-white/12 dark:bg-white/5 dark:text-parchment-50"
              />
              <select
                name="category"
                defaultValue="life"
                className="h-9 w-full rounded-lg border border-parchment-400 bg-parchment-50 px-3 text-[13px] dark:border-white/12 dark:bg-white/5 dark:text-parchment-50"
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <textarea
                name="description"
                rows={2}
                maxLength={280}
                placeholder="Optional note"
                className="w-full rounded-lg border border-parchment-400 bg-parchment-50 px-3 py-2 text-[13px] text-ink-900 dark:border-white/12 dark:bg-white/5 dark:text-parchment-50"
              />
              {entryOptions.length > 0 ? (
                <select
                  name="entryId"
                  defaultValue=""
                  className="h-9 w-full rounded-lg border border-parchment-400 bg-parchment-50 px-3 text-[13px] dark:border-white/12 dark:bg-white/5 dark:text-parchment-50"
                >
                  <option value="">Link to an entry (optional)</option>
                  {entryOptions.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.title}
                    </option>
                  ))}
                </select>
              ) : null}
              <Button type="submit" size="sm" className="w-full">
                Add milestone
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
