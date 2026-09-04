import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";

import { EntryEditor } from "@/components/editor/EntryEditor";
import { Badge } from "@/components/ui/Primitives";
import { ButtonLink } from "@/components/ui/Button";
import { getDb } from "@/db";
import { chapters, people } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import { getEntry } from "@/server/queries/entries";

export const metadata: Metadata = { title: "Writing" };
export const dynamic = "force-dynamic";

export default async function EditEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const entry = await getEntry(user.id, id);
  if (!entry) notFound();

  const db = await getDb();
  const [chapterRows, personRows] = await Promise.all([
    db
      .select({ id: chapters.id, title: chapters.title, emoji: chapters.emoji })
      .from(chapters)
      .where(eq(chapters.userId, user.id))
      .orderBy(asc(chapters.position)),
    db
      .select({ id: people.id, name: people.name, relationship: people.relationship })
      .from(people)
      .where(eq(people.userId, user.id))
      .orderBy(asc(people.name)),
  ]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <ButtonLink href="/entries" variant="ghost" size="sm">
          ← All entries
        </ButtonLink>
        <Badge tone={entry.status === "published" ? "green" : "amber"}>
          {entry.status === "published" ? "Finished" : "Draft"}
        </Badge>
        {entry.visibility === "shared" ? <Badge tone="blue">Shared</Badge> : null}
        {entry.visibility === "legacy" ? <Badge tone="brass">Legacy</Badge> : null}
        {entry.pinned ? <Badge tone="brass">Pinned</Badge> : null}
      </div>

      <EntryEditor
        entry={{
          id: entry.id,
          title: entry.title,
          body: entry.body,
          chapterId: entry.chapterId,
          occurredAt: entry.occurredAt,
          location: entry.location,
          mood: entry.mood,
          status: entry.status,
          visibility: entry.visibility,
          pinned: entry.pinned,
          shareEnabled: entry.shareEnabled,
          shareToken: entry.shareToken,
          promptQuestion: entry.promptQuestion,
          promptFollowUp: entry.promptFollowUp,
          tags: entry.tags,
          people: entry.people,
          photos: entry.photos,
          createdAt: entry.createdAt.toISOString(),
          updatedAt: entry.updatedAt.toISOString(),
        }}
        chapters={chapterRows}
        people={personRows}
        appUrl={getEnv().NEXT_PUBLIC_APP_URL}
      />
    </div>
  );
}
