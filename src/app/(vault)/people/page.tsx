import type { Metadata } from "next";

import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/Primitives";
import { Button } from "@/components/ui/Button";
import { requireUser } from "@/lib/auth/session";
import { listPeople } from "@/server/queries/library";
import { deletePersonAction, upsertPersonAction } from "@/server/actions/library";

export const metadata: Metadata = { title: "People" };
export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const user = await requireUser();
  const people = await listPeople(user.id);

  return (
    <>
      <PageHeader
        eyebrow="The cast"
        title="People"
        description="Everyone who appears in your story. Tag them on an entry and their memories gather here."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          {people.length === 0 ? (
            <EmptyState
              title="Nobody here yet"
              description="Add the people who matter to your story. You can tag them on entries as you write."
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {people.map((person) => (
                <li key={person.id}>
                  <Card className="h-full p-5">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brass-300/50 text-sm font-semibold text-brass-700 dark:bg-brass-700/25 dark:text-brass-300">
                        {person.name.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-serif text-lg font-semibold text-ink-900 dark:text-parchment-50">
                          {person.name}
                        </h2>
                        {person.relationship ? (
                          <p className="text-[13px] text-brass-700 dark:text-brass-300">
                            {person.relationship}
                          </p>
                        ) : null}
                        {person.notes ? (
                          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600 dark:text-parchment-400">
                            {person.notes}
                          </p>
                        ) : null}
                        <p className="mt-2 text-[12px] text-ink-500 dark:text-parchment-500">
                          {person.entryCount === 0
                            ? "Not in any entries yet"
                            : `In ${person.entryCount} ${person.entryCount === 1 ? "entry" : "entries"}`}
                        </p>

                        <details className="mt-3">
                          <summary className="cursor-pointer text-[12px] text-brass-600 underline underline-offset-2 dark:text-brass-300">
                            Edit
                          </summary>
                          <form action={upsertPersonAction} className="mt-3 space-y-2">
                            <input type="hidden" name="personId" value={person.id} />
                            <input
                              name="name"
                              defaultValue={person.name}
                              required
                              maxLength={80}
                              className="h-9 w-full rounded-lg border border-parchment-400 bg-parchment-50 px-3 text-[13px] text-ink-900 dark:border-white/12 dark:bg-white/5 dark:text-parchment-50"
                            />
                            <input
                              name="relationship"
                              defaultValue={person.relationship ?? ""}
                              placeholder="Relationship"
                              maxLength={60}
                              className="h-9 w-full rounded-lg border border-parchment-400 bg-parchment-50 px-3 text-[13px] text-ink-900 dark:border-white/12 dark:bg-white/5 dark:text-parchment-50"
                            />
                            <textarea
                              name="notes"
                              defaultValue={person.notes ?? ""}
                              rows={3}
                              maxLength={600}
                              placeholder="Notes about them"
                              className="w-full rounded-lg border border-parchment-400 bg-parchment-50 px-3 py-2 text-[13px] text-ink-900 dark:border-white/12 dark:bg-white/5 dark:text-parchment-50"
                            />
                            <Button type="submit" size="sm" className="w-full">
                              Save
                            </Button>
                          </form>
                          <form action={deletePersonAction} className="mt-2">
                            <input type="hidden" name="personId" value={person.id} />
                            <Button type="submit" variant="ghost" size="sm" className="w-full">
                              Delete person
                            </Button>
                          </form>
                        </details>
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <Card>
            <CardHeader title="Add a person" />
            <form action={upsertPersonAction} className="space-y-3 p-4">
              <input
                name="name"
                required
                maxLength={80}
                placeholder="Their name"
                className="h-9 w-full rounded-lg border border-parchment-400 bg-parchment-50 px-3 text-[13px] text-ink-900 dark:border-white/12 dark:bg-white/5 dark:text-parchment-50"
              />
              <input
                name="relationship"
                maxLength={60}
                placeholder="Relationship (Mother, oldest friend…)"
                className="h-9 w-full rounded-lg border border-parchment-400 bg-parchment-50 px-3 text-[13px] text-ink-900 dark:border-white/12 dark:bg-white/5 dark:text-parchment-50"
              />
              <textarea
                name="notes"
                rows={3}
                maxLength={600}
                placeholder="Anything you want to remember about them"
                className="w-full rounded-lg border border-parchment-400 bg-parchment-50 px-3 py-2 text-[13px] text-ink-900 dark:border-white/12 dark:bg-white/5 dark:text-parchment-50"
              />
              <Button type="submit" size="sm" className="w-full">
                Add person
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
