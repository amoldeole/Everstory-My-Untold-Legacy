import { eq } from "drizzle-orm";

import type { Database } from "@/db";
import { accounts, chapters, entries, milestones, people, sessions, tags, users } from "@/db/schema";
import { DEFAULT_CHAPTERS } from "@/lib/catalog/chapters";
import { hashPassword } from "@/lib/auth/password";

/**
 * Creates the starter chapter structure for a brand new writer.
 *
 * Idempotent: safe to call again (for example if a user deletes a chapter and
 * later asks for the defaults back).
 */
export async function createDefaultChapters(db: Database, userId: string): Promise<void> {
  const existing = await db
    .select({ id: chapters.id })
    .from(chapters)
    .where(eq(chapters.userId, userId))
    .limit(1);
  if (existing.length > 0) return;

  await db.insert(chapters).values(
    DEFAULT_CHAPTERS.map((chapter) => ({
      userId,
      slug: chapter.slug,
      title: chapter.title,
      description: chapter.description,
      emoji: chapter.emoji,
      position: chapter.position,
    })),
  );
}

export interface CreateUserInput {
  email: string;
  name: string;
  password?: string | null;
  avatarUrl?: string | null;
  timezone?: string;
}

export async function createUserWithDefaults(db: Database, input: CreateUserInput): Promise<string> {
  const email = input.email.trim().toLowerCase();
  const [user] = await db
    .insert(users)
    .values({
      email,
      name: input.name.trim(),
      passwordHash: input.password ? await hashPassword(input.password) : null,
      avatarUrl: input.avatarUrl ?? null,
      timezone: input.timezone ?? "UTC",
    })
    .returning({ id: users.id });

  if (!user) throw new Error("Failed to create user");
  await createDefaultChapters(db, user.id);
  return user.id;
}

/**
 * Removes a user and everything they own.
 *
 * Relies on `ON DELETE CASCADE` for entries, chapters, media, tags, sessions
 * and OAuth links. Join tables that reference entries through a second hop are
 * deleted explicitly first so nothing is orphaned.
 */
export async function deleteUserData(db: Database, userId: string): Promise<void> {
  const ownedEntries = db.select({ id: entries.id }).from(entries).where(eq(entries.userId, userId));

  await db.delete(milestones).where(eq(milestones.userId, userId));
  await db.delete(people).where(eq(people.userId, userId));
  await db.delete(tags).where(eq(tags.userId, userId));
  await db.delete(entries).where(eq(entries.userId, userId));
  await db.delete(chapters).where(eq(chapters.userId, userId));
  await db.delete(accounts).where(eq(accounts.userId, userId));
  await db.delete(sessions).where(eq(sessions.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
  void ownedEntries;
}
