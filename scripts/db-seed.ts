import { eq, sql } from "drizzle-orm";

import { closeDb, getDb, type Database } from "../src/db";
import {
  chapters,
  entries,
  entryPeople,
  entryTags,
  milestones,
  people,
  prompts,
  tags,
  users,
} from "../src/db/schema";
import { DEFAULT_PROMPTS } from "../src/lib/catalog/prompts";
import { DEFAULT_CHAPTERS } from "../src/lib/catalog/chapters";
import { createUserWithDefaults } from "../src/lib/onboarding";
import { countWords, makeExcerpt } from "../src/lib/utils/text";

const DEMO_EMAIL = "demo@everstory.local";
const DEMO_PASSWORD = process.env.EVERSTORY_DEMO_PASSWORD ?? "everstory-demo";

/** Seeds the shared prompt library. Safe to run repeatedly. */
async function seedPrompts(db: Database): Promise<void> {
  await db
    .insert(prompts)
    .values(DEFAULT_PROMPTS)
    .onConflictDoUpdate({
      target: prompts.slug,
      set: {
        question: sql`excluded.question`,
        followUp: sql`excluded.follow_up`,
        chapterSlug: sql`excluded.chapter_slug`,
        category: sql`excluded.category`,
        position: sql`excluded.position`,
      },
    });
  console.log(`✓ Seeded ${DEFAULT_PROMPTS.length} writing prompts`);
}

interface DemoEntry {
  chapterSlug: string;
  title: string;
  body: string;
  occurredAt?: string;
  location?: string;
  mood?: string;
  status: "draft" | "published";
  visibility: "private" | "shared" | "legacy";
  tags?: string[];
  peopleNames?: string[];
  share?: boolean;
}

const DEMO_ENTRIES: DemoEntry[] = [
  {
    chapterSlug: "roots",
    title: "The blue door on Kaka Chowk",
    body: `The house had a blue door that nobody ever repainted, and that is the first thing I see when I close my eyes.

It opened straight into the front room, so the street was always half inside with us. Sandals in a row by the threshold. A brass bell that did not work but hung there anyway, out of respect for the idea of a bell.

Aai kept the radio on the shelf above the grain tin, tuned to a station that played film songs from before I was born. It hissed between tracks. I can still hear that hiss.`,
    occurredAt: "1986-04-12",
    location: "Pimpri-Chinchwad, Maharashtra",
    mood: "nostalgic",
    status: "published",
    visibility: "shared",
    tags: ["home", "family"],
    peopleNames: ["Aai", "Baba"],
    share: true,
  },
  {
    chapterSlug: "childhood",
    title: "Monsoon and the flooded lane",
    body: `When the rain came properly, the lane outside turned into a river and every adult in the neighbourhood gave up on the day.

We did not. We folded newspaper into boats that lasted ninety seconds and then sagged into pulp. The good ones — the ones folded twice at the spine — made it all the way to the corner where the water slowed and the drain swallowed them.

Someone's mother always called someone home first. It was never me.`,
    occurredAt: "1991-07-20",
    location: "Pimpri-Chinchwad",
    mood: "joyful",
    status: "published",
    visibility: "private",
    tags: ["weather", "play"],
    peopleNames: ["Aai"],
  },
  {
    chapterSlug: "turning-points",
    title: "The day I said yes before I was ready",
    body: `I had three seconds to decide, and I have had years to think about why I said yes.

It was not courage. Courage implies you understood the risk and chose it anyway. What I had was a kind of tiredness with being careful, a suspicion that if I weighed this one properly I would talk myself out of it — and that the person who talked himself out of things was someone I was getting bored of being.

Everything good since then is downstream of those three seconds. So is one thing I would undo.`,
    occurredAt: "2011-09-02",
    mood: "reflective",
    status: "draft",
    visibility: "private",
    tags: ["work", "decisions"],
  },
  {
    chapterSlug: "work-and-craft",
    title: "What shipping taught me about finishing",
    body: `The first version is never the one you imagined, and that used to make me stop.

Now I know the gap between the imagined version and the shipped version is not a failure — it is the tuition fee. You pay it every time. The only people who do not pay it are the people who never finish anything, and they pay a different, larger fee instead.`,
    mood: "focused",
    status: "published",
    visibility: "private",
    tags: ["work", "craft"],
  },
  {
    chapterSlug: "letters",
    title: "To whoever reads this in forty years",
    body: `You will know things about the world that I cannot imagine, and you will almost certainly be more impatient with us than you need to be.

Here is the one thing I want on the record: the people in these pages were not simple. Every one of them was doing their best with a set of tools they did not choose, in a century that did not ask whether they were ready for it. Judge them gently. You are being written down too.`,
    mood: "tender",
    status: "draft",
    visibility: "legacy",
    tags: ["legacy"],
  },
];

const DEMO_MILESTONES = [
  { title: "Born", occurredOn: "1986-04-12", category: "life" },
  { title: "First day of school", occurredOn: "1991-06-15", category: "education" },
  { title: "Left home for university", occurredOn: "2004-07-01", category: "education" },
  { title: "First job", occurredOn: "2008-06-09", category: "work" },
  { title: "Married", occurredOn: "2014-11-22", category: "family" },
  { title: "Moved back west", occurredOn: "2019-03-04", category: "home" },
];

const DEMO_PEOPLE = [
  {
    name: "Aai",
    relationship: "Mother",
    notes: "Kept the radio on. Never wasted food. Laughed at her own jokes before finishing them.",
  },
  {
    name: "Baba",
    relationship: "Father",
    notes: "Fixed everything twice — once properly, once to show me how.",
  },
  {
    name: "Kiran",
    relationship: "Oldest friend",
    notes: "Known since standard four. Still answers on the second ring.",
  },
];

/** Creates a fully populated demo account so the UI is explorable immediately. */
async function seedDemo(db: Database): Promise<void> {
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, DEMO_EMAIL)).limit(1);

  let userId = existing[0]?.id;
  if (userId) {
    console.log(`· Demo user already exists (${DEMO_EMAIL}) — skipping creation`);
  } else {
    userId = await createUserWithDefaults(db, {
      email: DEMO_EMAIL,
      name: "Demo Writer",
      password: DEMO_PASSWORD,
      timezone: "Asia/Kolkata",
    });
    console.log(`✓ Created demo user (${DEMO_EMAIL})`);
  }

  const chapterRows = await db
    .select({ id: chapters.id, slug: chapters.slug })
    .from(chapters)
    .where(eq(chapters.userId, userId));
  const chapterBySlug = new Map(chapterRows.map((row) => [row.slug, row.id]));

  const existingEntries = await db
    .select({ id: entries.id })
    .from(entries)
    .where(eq(entries.userId, userId))
    .limit(1);
  if (existingEntries.length > 0) {
    console.log("· Demo entries already exist — skipping");
    return;
  }

  const peopleRows = await db
    .insert(people)
    .values(DEMO_PEOPLE.map((person) => ({ ...person, userId })))
    .returning({ id: people.id, name: people.name });
  const personByName = new Map(peopleRows.map((row) => [row.name, row.id]));

  const tagNames = Array.from(new Set(DEMO_ENTRIES.flatMap((entry) => entry.tags ?? [])));
  const tagRows = tagNames.length
    ? await db
        .insert(tags)
        .values(tagNames.map((name) => ({ name, userId })))
        .returning({ id: tags.id, name: tags.name })
    : [];
  const tagByName = new Map(tagRows.map((row) => [row.name, row.id]));

  for (const [index, entry] of DEMO_ENTRIES.entries()) {
    const [row] = await db
      .insert(entries)
      .values({
        userId,
        chapterId: chapterBySlug.get(entry.chapterSlug) ?? null,
        title: entry.title,
        body: entry.body,
        excerpt: makeExcerpt(entry.body),
        entryType: "memory",
        status: entry.status,
        visibility: entry.visibility,
        mood: entry.mood ?? null,
        occurredAt: entry.occurredAt ?? null,
        location: entry.location ?? null,
        wordCount: countWords(entry.body),
        pinned: index === 0,
        shareEnabled: Boolean(entry.share),
        shareToken: entry.share ? `demo-share-${entry.chapterSlug}` : null,
      })
      .returning({ id: entries.id });

    if (!row) continue;

    for (const name of entry.peopleNames ?? []) {
      const personId = personByName.get(name);
      if (personId) await db.insert(entryPeople).values({ entryId: row.id, personId }).onConflictDoNothing();
    }

    for (const name of entry.tags ?? []) {
      const tagId = tagByName.get(name);
      if (tagId) await db.insert(entryTags).values({ entryId: row.id, tagId }).onConflictDoNothing();
    }
  }

  await db.insert(milestones).values(DEMO_MILESTONES.map((milestone) => ({ ...milestone, userId })));

  console.log(
    `✓ Created ${DEMO_ENTRIES.length} demo entries, ${DEMO_MILESTONES.length} milestones, ${DEFAULT_CHAPTERS.length} chapters`,
  );
  console.log(`\n  Sign in with:`);
  console.log(`    email:    ${DEMO_EMAIL}`);
  console.log(`    password: ${DEMO_PASSWORD}`);
}

async function main(): Promise<void> {
  const withDemo = process.argv.includes("--demo") || process.argv.includes("-d");
  const db = await getDb();
  await seedPrompts(db);
  if (withDemo) await seedDemo(db);
  else console.log("· Skipping demo data (run `npm run db:seed -- --demo` to add it)");
  await closeDb();
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error("✗ Seed failed");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
