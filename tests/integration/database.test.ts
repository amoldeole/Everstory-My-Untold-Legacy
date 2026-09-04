import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";

import { getDb, type Database } from "@/db";
import { chapters, entries, media, milestones, people, prompts, tags, users } from "@/db/schema";
import { createDefaultChapters, createUserWithDefaults, deleteUserData } from "@/lib/onboarding";
import { applyEntryPatch } from "@/server/entries/service";
import { listEntries, listChaptersWithProgress, currentStreak } from "@/server/queries/entries";
import { listPrompts, listTimelineEvents } from "@/server/queries/library";
import { buildBook } from "@/lib/export/book";
import { hashPassword } from "@/lib/auth/password";

/**
 * Integration tests against a real Postgres database.
 *
 * By default these run on PGlite — the same embedded Postgres the dev server
 * uses — so no service is required. CI additionally runs this file with
 * `DATABASE_URL` set, which exercises the exact engine you deploy to.
 */
let db: Database;

async function reset(): Promise<void> {
  // Child rows cascade; truncating the parent is enough to start clean.
  await db.execute(sql`truncate table ${users} restart identity cascade`);
  await db.execute(sql`truncate table ${prompts} restart identity cascade`);
}

beforeAll(async () => {
  db = await getDb();
  await reset();
});

beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await reset();
});

async function makeUser(email = "writer@example.com") {
  return createUserWithDefaults(db, { email, name: "Test Writer", password: "a-good-passphrase" });
}

describe("schema and migrations", () => {
  it("connects and reports a Postgres version", async () => {
    const rows = await db.execute(sql`select version() as version`);
    const row = (Array.isArray(rows) ? rows[0] : (rows as { rows?: unknown[] }).rows?.[0]) as
      { version?: string } | undefined;
    expect(row?.version ?? "").toMatch(/postgres/i);
  });

  it("created every table the app expects", async () => {
    const rows = await db.execute(
      sql`select table_name from information_schema.tables where table_schema = 'public'`,
    );
    const list = Array.isArray(rows) ? rows : ((rows as { rows?: unknown[] }).rows ?? []);
    const names = new Set((list as Array<{ table_name: string }>).map((row) => row.table_name));
    for (const table of ["users", "sessions", "entries", "chapters", "media", "milestones", "prompts"]) {
      expect(names.has(table)).toBe(true);
    }
  });
});

describe("user creation", () => {
  it("creates the default chapters for a new writer", async () => {
    const userId = await makeUser();
    const rows = await db.select().from(chapters).where(eq(chapters.userId, userId));
    expect(rows.length).toBe(15);
    expect(rows.map((row) => row.slug)).toContain("childhood");
  });

  it("stores a hashed password, never the plaintext", async () => {
    await makeUser();
    const rows = await db.select().from(users).where(eq(users.email, "writer@example.com"));
    expect(rows[0]?.passwordHash).toBeTruthy();
    expect(rows[0]?.passwordHash).not.toContain("a-good-passphrase");
    expect(rows[0]?.passwordHash).toMatch(/^scrypt\$/);
  });

  it("normalises the email address to lowercase", async () => {
    await createUserWithDefaults(db, {
      email: "MixedCase@Example.COM",
      name: "X",
      password: "a-good-passphrase",
    });
    const rows = await db.select().from(users).where(eq(users.email, "mixedcase@example.com"));
    expect(rows.length).toBe(1);
  });

  it("enforces unique emails case-insensitively", async () => {
    await makeUser("dupe@example.com");
    await expect(makeUser("DUPE@example.com")).rejects.toThrow();
  });

  it("does not recreate chapters if they already exist", async () => {
    const userId = await makeUser();
    await createDefaultChapters(db, userId);
    const rows = await db.select().from(chapters).where(eq(chapters.userId, userId));
    expect(rows.length).toBe(15);
  });
});

describe("entry patching", () => {
  it("derives word count and excerpt from the body", async () => {
    const userId = await makeUser();
    const [entry] = await db
      .insert(entries)
      .values({ userId, title: "A memory", body: "" })
      .returning({ id: entries.id });

    const body = "The house had a blue door that nobody ever repainted, and that is the first thing I see.";
    await applyEntryPatch(userId, entry!.id, { body });

    const [updated] = await db.select().from(entries).where(eq(entries.id, entry!.id));
    expect(updated?.wordCount).toBeGreaterThan(10);
    expect(updated?.excerpt).toContain("blue door");
  });

  it("falls back to 'Untitled' when the title is cleared", async () => {
    const userId = await makeUser();
    const [entry] = await db
      .insert(entries)
      .values({ userId, title: "Something", body: "" })
      .returning({ id: entries.id });

    await applyEntryPatch(userId, entry!.id, { title: "" });
    const [updated] = await db.select().from(entries).where(eq(entries.id, entry!.id));
    expect(updated?.title).toBe("Untitled");
  });

  it("refuses to patch an entry belonging to someone else", async () => {
    const owner = await makeUser("owner@example.com");
    const other = await makeUser("other@example.com");

    const [entry] = await db
      .insert(entries)
      .values({ userId: owner, title: "Private", body: "" })
      .returning({ id: entries.id });

    const result = await applyEntryPatch(other, entry!.id, { title: "Hijacked" });
    expect(result).toBeNull();

    const [unchanged] = await db.select().from(entries).where(eq(entries.id, entry!.id));
    expect(unchanged?.title).toBe("Private");
  });
});

describe("ownership scoping", () => {
  it("never returns another writer's entries", async () => {
    const a = await makeUser("a@example.com");
    const b = await makeUser("b@example.com");

    await db.insert(entries).values([
      { userId: a, title: "A's entry", body: "secret" },
      { userId: b, title: "B's entry", body: "also secret" },
    ]);

    const mine = await listEntries({ userId: a });
    expect(mine.total).toBe(1);
    expect(mine.items[0]?.title).toBe("A's entry");
    expect(JSON.stringify(mine.items)).not.toContain("also secret");
  });

  it("filters by search term across title and body", async () => {
    const userId = await makeUser();
    await db.insert(entries).values([
      { userId, title: "Monsoon", body: "The lane flooded every year." },
      { userId, title: "Bicycles", body: "We rode until the streetlights came on." },
    ]);

    const found = await listEntries({ userId, search: "streetlights" });
    expect(found.total).toBe(1);
    expect(found.items[0]?.title).toBe("Bicycles");
  });

  it("filters by status", async () => {
    const userId = await makeUser();
    await db.insert(entries).values([
      { userId, title: "Draft", body: "", status: "draft" },
      { userId, title: "Done", body: "", status: "published" },
    ]);

    const published = await listEntries({ userId, status: "published" });
    expect(published.total).toBe(1);
    expect(published.items[0]?.title).toBe("Done");
  });
});

describe("chapter progress", () => {
  it("counts entries and words per chapter", async () => {
    const userId = await makeUser();
    const [chapter] = await db.select().from(chapters).where(eq(chapters.slug, "childhood")).limit(1);

    await db.insert(entries).values([
      { userId, chapterId: chapter!.id, title: "One", body: "one two three", wordCount: 3 },
      { userId, chapterId: chapter!.id, title: "Two", body: "four five", wordCount: 2 },
    ]);

    const progress = await listChaptersWithProgress(userId);
    const childhood = progress.find((row) => row.slug === "childhood");
    expect(childhood?.entryCount).toBe(2);
    expect(childhood?.wordCount).toBe(5);
  });
});

describe("timeline", () => {
  it("merges milestones and dated entries in order", async () => {
    const userId = await makeUser();

    await db.insert(milestones).values([
      { userId, title: "Born", occurredOn: "1986-04-12", category: "life" },
      { userId, title: "First job", occurredOn: "2008-06-09", category: "work" },
    ]);
    await db.insert(entries).values([{ userId, title: "The blue door", body: "", occurredAt: "1991-07-20" }]);

    const events = await listTimelineEvents(userId);
    expect(events.map((event) => event.date)).toEqual(["1986-04-12", "1991-07-20", "2008-06-09"]);
    expect(events[1]?.kind).toBe("entry");
  });

  it("hides entries dated in the future", async () => {
    const userId = await makeUser();
    await db.insert(entries).values([{ userId, title: "Too early", body: "", occurredAt: "2999-01-01" }]);

    const events = await listTimelineEvents(userId);
    expect(events.length).toBe(0);
  });
});

describe("prompts", () => {
  it("reports which prompts have been answered", async () => {
    const userId = await makeUser();

    await db.insert(prompts).values([
      { slug: "p-one", question: "One?", category: "life", position: 0 },
      { slug: "p-two", question: "Two?", category: "life", position: 1 },
    ]);

    const [prompt] = await db.select().from(prompts).where(eq(prompts.slug, "p-one")).limit(1);
    await db.insert(entries).values([{ userId, title: "Answer one", body: "", promptId: prompt!.id }]);

    const list = await listPrompts(userId);
    const one = list.find((row) => row.slug === "p-one");
    const two = list.find((row) => row.slug === "p-two");

    expect(one?.answered).toBe(true);
    expect(one?.entryId).toBeTruthy();
    expect(two?.answered).toBe(false);
  });
});

describe("export assembly", () => {
  it("groups entries by chapter and excludes empty chapters", async () => {
    const userId = await makeUser();
    const [chapter] = await db.select().from(chapters).where(eq(chapters.slug, "childhood")).limit(1);

    await db.insert(entries).values([
      { userId, chapterId: chapter!.id, title: "In a chapter", body: "Words here.", wordCount: 2 },
      { userId, title: "No chapter", body: "More words.", wordCount: 2 },
    ]);

    const book = await buildBook(userId);
    expect(book.chapters.length).toBe(2);
    expect(book.chapters[0]?.title).toBe("Childhood");
    expect(book.chapters[0]?.entries[0]?.title).toBe("In a chapter");
    expect(book.chapters[1]?.title).toBe("Unsorted memories");
    expect(book.totals.entries).toBe(2);
  });

  it("honours the 'published only' option", async () => {
    const userId = await makeUser();
    await db.insert(entries).values([
      { userId, title: "Draft", body: "", status: "draft", visibility: "shared" },
      { userId, title: "Finished", body: "", status: "published", visibility: "shared" },
      { userId, title: "Secret", body: "", status: "published", visibility: "private" },
    ]);

    // Drafts excluded...
    const finishedOnly = await buildBook(userId, { includeDrafts: false, includePrivate: true });
    expect(finishedOnly.totals.entries).toBe(2);

    // ...and private entries excluded too.
    const sharedOnly = await buildBook(userId, { includeDrafts: false, includePrivate: false });
    expect(sharedOnly.totals.entries).toBe(1);
    expect(sharedOnly.chapters[0]?.entries[0]?.title).toBe("Finished");
  });
});

describe("streak calculation", () => {
  it("counts consecutive days ending today", () => {
    const today = new Date();
    const key = (offset: number) =>
      new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offset))
        .toISOString()
        .slice(0, 10);

    expect(currentStreak(new Set([key(0), key(1), key(2)]))).toBe(3);
    expect(currentStreak(new Set([key(0)]))).toBe(1);
    expect(currentStreak(new Set([key(3)]))).toBe(0);
    expect(currentStreak(new Set())).toBe(0);
  });
});

describe("account deletion", () => {
  it("removes the user and everything they own", async () => {
    const userId = await makeUser("delete-me@example.com");

    const [chapter] = await db.select().from(chapters).where(eq(chapters.userId, userId)).limit(1);
    await db.insert(entries).values([{ userId, chapterId: chapter!.id, title: "Gone", body: "" }]);
    await db.insert(people).values([{ userId, name: "Someone" }]);
    await db.insert(tags).values([{ userId, name: "tag" }]);
    await db
      .insert(media)
      .values([{ userId, storageKey: "u/x/y.jpg", filename: "y.jpg", mimeType: "image/jpeg", byteSize: 10 }]);

    await deleteUserData(db, userId);

    expect(await db.select().from(users).where(eq(users.id, userId))).toHaveLength(0);
    expect(await db.select().from(entries).where(eq(entries.userId, userId))).toHaveLength(0);
    expect(await db.select().from(chapters).where(eq(chapters.userId, userId))).toHaveLength(0);
    expect(await db.select().from(people).where(eq(people.userId, userId))).toHaveLength(0);
    expect(await db.select().from(media).where(eq(media.userId, userId))).toHaveLength(0);
  });
});

describe("password hashing at rest", () => {
  it("verifies a password stored through the onboarding path", async () => {
    const userId = await createUserWithDefaults(db, {
      email: "verify@example.com",
      name: "V",
      password: "a-very-long-passphrase",
    });
    const [row] = await db.select().from(users).where(eq(users.id, userId));

    const { verifyPassword } = await import("@/lib/auth/password");
    expect(await verifyPassword("a-very-long-passphrase", row?.passwordHash ?? null)).toBe(true);
    expect(await verifyPassword("wrong", row?.passwordHash ?? null)).toBe(false);
  });

  it("produces hashes that differ between users with the same password", async () => {
    const a = await hashPassword("shared-passphrase-123");
    const b = await hashPassword("shared-passphrase-123");
    expect(a).not.toBe(b);
  });
});
