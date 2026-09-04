import { eq } from "drizzle-orm";

import { getDb, type Database } from "@/db";
import { users } from "@/db/schema";
import { getEnv } from "@/lib/env";

import type { SessionUser } from "./session";

const SINGLE_USER_EMAIL = "owner@everstory.local";
const SINGLE_USER_NAME = "Local Owner";

/**
 * AUTH_MODE=single support.
 *
 * For people who want to try Everstory (or run it for one person on a home
 * machine) without creating an account. The session layer falls back to this
 * user when no cookie is present, so there is no sign-in step at all.
 *
 * It is disabled in production unless you explicitly set AUTH_MODE=single.
 */
export async function resolveSingleUser(db: Database): Promise<SessionUser | null> {
  const env = getEnv();
  if (env.AUTH_MODE !== "single") return null;

  const existing = await db.select().from(users).where(eq(users.email, SINGLE_USER_EMAIL)).limit(1);
  const row = existing[0];

  if (!row) {
    const { createUserWithDefaults } = await import("@/lib/onboarding");
    const id = await createUserWithDefaults(db, {
      email: SINGLE_USER_EMAIL,
      name: SINGLE_USER_NAME,
      password: null,
    });
    const created = await db.select().from(users).where(eq(users.id, id)).limit(1);
    const createdRow = created[0];
    if (!createdRow) return null;
    return toSessionUser(createdRow);
  }

  return toSessionUser(row);
}

function toSessionUser(row: typeof users.$inferSelect): SessionUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatarUrl,
    bio: row.bio,
    timezone: row.timezone,
    preferences: (row.preferences ?? {}) as SessionUser["preferences"],
    createdAt: row.createdAt,
  };
}

export async function getSingleUser(): Promise<SessionUser | null> {
  const db = await getDb();
  return resolveSingleUser(db);
}
