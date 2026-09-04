import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { entries, entryPeople, entryTags, people, tags } from "@/db/schema";
import { authenticate, apiError, json, parseBody } from "@/server/api/helpers";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

const tagSchema = z.object({ name: z.string().trim().min(1).max(40) });
const personSchema = z.object({ personId: z.string().uuid() });
const linkSchema = z.discriminatedUnion("kind", [
  tagSchema.extend({ kind: z.literal("tag") }),
  personSchema.extend({ kind: z.literal("person") }),
]);

async function assertOwned(userId: string, entryId: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .select({ id: entries.id })
    .from(entries)
    .where(and(eq(entries.id, entryId), eq(entries.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

/** Attaches a tag or a person to an entry. */
export async function POST(request: Request, context: Context) {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!(await assertOwned(auth.user.id, id))) return apiError("Entry not found.", 404);

  const body = await parseBody(request, linkSchema);
  if (!body.ok) return body.response;

  const db = await getDb();

  if (body.data.kind === "tag") {
    const name = body.data.name.trim();

    // Find or create the tag for this user, then link it.
    const existing = await db
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.userId, auth.user.id), eq(tags.name, name)))
      .limit(1);

    let tagId = existing[0]?.id;
    if (!tagId) {
      const [created] = await db
        .insert(tags)
        .values({ userId: auth.user.id, name, color: "brass" })
        .returning({ id: tags.id });
      tagId = created?.id;
    }
    if (!tagId) return apiError("Could not create the tag.", 500);

    await db.insert(entryTags).values({ entryId: id, tagId }).onConflictDoNothing();
    return json({ ok: true, tag: { id: tagId, name } });
  }

  const [person] = await db
    .select({ id: people.id })
    .from(people)
    .where(and(eq(people.id, body.data.personId), eq(people.userId, auth.user.id)))
    .limit(1);

  if (!person) return apiError("Person not found.", 404);

  await db.insert(entryPeople).values({ entryId: id, personId: person.id }).onConflictDoNothing();
  return json({ ok: true, personId: person.id });
}

/** Detaches a tag or a person. */
export async function DELETE(request: Request, context: Context) {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!(await assertOwned(auth.user.id, id))) return apiError("Entry not found.", 404);

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const targetId = url.searchParams.get("id");

  if (!targetId || (kind !== "tag" && kind !== "person")) {
    return apiError("Provide ?kind=tag|person and &id=...", 400);
  }

  const db = await getDb();

  if (kind === "tag") {
    await db.delete(entryTags).where(and(eq(entryTags.entryId, id), eq(entryTags.tagId, targetId)));
    return json({ ok: true });
  }

  await db.delete(entryPeople).where(and(eq(entryPeople.entryId, id), eq(entryPeople.personId, targetId)));
  return json({ ok: true });
}
