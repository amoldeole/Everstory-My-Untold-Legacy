import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/*  Identity & access                                                          */
/* -------------------------------------------------------------------------- */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash"),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    timezone: text("timezone").notNull().default("UTC"),
    /** Free-form preferences: theme, reminder cadence, editor options... */
    preferences: jsonb("preferences").$type<UserPreferences>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_unique").on(sql`lower(${t.email})`)],
);

export interface UserPreferences {
  theme?: "light" | "dark" | "system";
  dailyReminder?: boolean;
  writingGoalWords?: number;
  defaultEntryVisibility?: EntryVisibility;
}

/** Links a local account to an external OAuth provider. */
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    email: text("email"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("accounts_provider_account_unique").on(t.provider, t.providerAccountId),
    index("accounts_user_idx").on(t.userId),
  ],
);

/**
 * Opaque, revocable, database-backed sessions. The cookie only ever carries
 * the raw token; we store a SHA-256 hash, so a database leak does not hand an
 * attacker usable session tokens.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
  },
  (t) => [
    uniqueIndex("sessions_token_hash_unique").on(t.tokenHash),
    index("sessions_user_idx").on(t.userId),
    index("sessions_expires_idx").on(t.expiresAt),
  ],
);

/* -------------------------------------------------------------------------- */
/*  The memoir itself                                                          */
/* -------------------------------------------------------------------------- */

export const EntryVisibility = ["private", "shared", "legacy"] as const;
export type EntryVisibility = (typeof EntryVisibility)[number];

export const EntryStatus = ["draft", "published"] as const;
export type EntryStatus = (typeof EntryStatus)[number];

export const EntryType = ["chapter", "memory", "letter", "prompt"] as const;
export type EntryType = (typeof EntryType)[number];

/** A section of the life story: Childhood, First Love, The Hard Year... */
export const chapters = pgTable(
  "chapters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    emoji: text("emoji").notNull().default("📖"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("chapters_user_slug_unique").on(t.userId, t.slug),
    index("chapters_user_idx").on(t.userId),
  ],
);

/** A piece of writing. One entry belongs to one author, optionally one chapter. */
export const entries = pgTable(
  "entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chapterId: uuid("chapter_id").references(() => chapters.id, { onDelete: "set null" }),
    promptId: uuid("prompt_id").references(() => prompts.id, { onDelete: "set null" }),
    title: text("title").notNull().default("Untitled"),
    body: text("body").notNull().default(""),
    /** Short teaser used in lists, exports and share pages. */
    excerpt: text("excerpt"),
    entryType: text("entry_type").$type<EntryType>().notNull().default("memory"),
    status: text("status").$type<EntryStatus>().notNull().default("draft"),
    visibility: text("visibility").$type<EntryVisibility>().notNull().default("private"),
    mood: text("mood"),
    /** When the memory happened — drives the timeline. */
    occurredAt: date("occurred_at"),
    location: text("location"),
    wordCount: integer("word_count").notNull().default(0),
    pinned: boolean("pinned").notNull().default(false),
    /** Null until the author explicitly publishes a share link. */
    shareToken: text("share_token"),
    shareEnabled: boolean("share_enabled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("entries_share_token_unique").on(t.shareToken),
    index("entries_user_idx").on(t.userId),
    index("entries_user_updated_idx").on(t.userId, t.updatedAt),
    index("entries_chapter_idx").on(t.chapterId),
    index("entries_occurred_idx").on(t.userId, t.occurredAt),
  ],
);

/** Dated life events rendered on the timeline. */
export const milestones = pgTable(
  "milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entryId: uuid("entry_id").references(() => entries.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    occurredOn: date("occurred_on").notNull(),
    category: text("category").notNull().default("life"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("milestones_user_idx").on(t.userId), index("milestones_date_idx").on(t.occurredOn)],
);

/** The cast of your story. */
export const people = pgTable(
  "people",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    relationship: text("relationship"),
    notes: text("notes"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("people_user_idx").on(t.userId)],
);

export const entryPeople = pgTable(
  "entry_people",
  {
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
  },
  (t) => [index("entry_people_entry_idx").on(t.entryId), index("entry_people_person_idx").on(t.personId)],
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("amber"),
  },
  (t) => [uniqueIndex("tags_user_name_unique").on(t.userId, sql`lower(${t.name})`)],
);

export const entryTags = pgTable(
  "entry_tags",
  {
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [index("entry_tags_entry_idx").on(t.entryId), index("entry_tags_tag_idx").on(t.tagId)],
);

/** Uploaded photos and documents. */
export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entryId: uuid("entry_id").references(() => entries.id, { onDelete: "set null" }),
    /** Key into the configured storage driver (disk or S3-compatible). */
    storageKey: text("storage_key").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull().default(0),
    altText: text("alt_text"),
    width: integer("width"),
    height: integer("height"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("media_user_idx").on(t.userId),
    index("media_entry_idx").on(t.entryId),
    uniqueIndex("media_storage_key_unique").on(t.storageKey),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Prompt library (seeded, shared across all users)                           */
/* -------------------------------------------------------------------------- */

export const prompts = pgTable(
  "prompts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    chapterSlug: text("chapter_slug"),
    question: text("question").notNull(),
    followUp: text("follow_up"),
    category: text("category").notNull().default("life"),
    position: integer("position").notNull().default(0),
  },
  (t) => [uniqueIndex("prompts_slug_unique").on(t.slug), index("prompts_category_idx").on(t.category)],
);

/* -------------------------------------------------------------------------- */
/*  Legacy & export                                                            */
/* -------------------------------------------------------------------------- */

/** People who should be able to read the legacy-visibility entries one day. */
export const legacyContacts = pgTable(
  "legacy_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    relationship: text("relationship"),
    /** Unguessable token for the read-only legacy link. */
    accessToken: text("access_token").notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("legacy_contacts_token_unique").on(t.accessToken),
    index("legacy_contacts_user_idx").on(t.userId),
  ],
);

export const exports = pgTable(
  "exports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    format: text("format").notNull(),
    status: text("status").notNull().default("ready"),
    filename: text("filename").notNull(),
    byteSize: integer("byte_size").notNull().default(0),
    entryCount: integer("entry_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("exports_user_idx").on(t.userId)],
);

/* -------------------------------------------------------------------------- */
/*  Relations                                                                  */
/* -------------------------------------------------------------------------- */

export const usersRelations = relations(users, ({ many }) => ({
  entries: many(entries),
  chapters: many(chapters),
  milestones: many(milestones),
  people: many(people),
  tags: many(tags),
  media: many(media),
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  user: one(users, { fields: [chapters.userId], references: [users.id] }),
  entries: many(entries),
}));

export const entriesRelations = relations(entries, ({ one, many }) => ({
  user: one(users, { fields: [entries.userId], references: [users.id] }),
  chapter: one(chapters, { fields: [entries.chapterId], references: [chapters.id] }),
  prompt: one(prompts, { fields: [entries.promptId], references: [prompts.id] }),
  media: many(media),
  people: many(entryPeople),
  tags: many(entryTags),
}));

export const peopleRelations = relations(people, ({ many }) => ({
  entries: many(entryPeople),
}));

export const entryPeopleRelations = relations(entryPeople, ({ one }) => ({
  entry: one(entries, { fields: [entryPeople.entryId], references: [entries.id] }),
  person: one(people, { fields: [entryPeople.personId], references: [people.id] }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  entries: many(entryTags),
}));

export const entryTagsRelations = relations(entryTags, ({ one }) => ({
  entry: one(entries, { fields: [entryTags.entryId], references: [entries.id] }),
  tag: one(tags, { fields: [entryTags.tagId], references: [tags.id] }),
}));

export const mediaRelations = relations(media, ({ one }) => ({
  entry: one(entries, { fields: [media.entryId], references: [entries.id] }),
  user: one(users, { fields: [media.userId], references: [users.id] }),
}));

export const promptsRelations = relations(prompts, ({ many }) => ({
  entries: many(entries),
}));
