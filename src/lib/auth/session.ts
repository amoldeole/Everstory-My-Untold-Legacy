import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, lt, ne } from "drizzle-orm";

import { getDb } from "@/db";
import { sessions, users, type UserPreferences } from "@/db/schema";
import { getEnv } from "@/lib/env";
import { getSingleUser } from "@/lib/auth/single-user";

export const SESSION_COOKIE = "everstory_session";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  timezone: string;
  preferences: UserPreferences;
  createdAt: Date;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a session, stores only the hash, and writes the cookie.
 *
 * Must be called from a Server Action or Route Handler, because those are the
 * only places Next.js allows cookies to be written.
 */
export async function createSession(
  userId: string,
  meta: { userAgent?: string | null; ipAddress?: string | null } = {},
): Promise<void> {
  const env = getEnv();
  const db = await getDb();

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    tokenHash: hashToken(token),
    userId,
    expiresAt,
    userAgent: meta.userAgent?.slice(0, 512) ?? null,
    ipAddress: meta.ipAddress ?? null,
  });

  // Opportunistic cleanup: this user's dead sessions cost nothing to remove
  // while we are already writing.
  await db.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())));

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  store.delete(SESSION_COOKIE);
}

/** Destroys every session belonging to a user — used on password change. */
export async function destroyAllSessionsForUser(userId: string, exceptToken?: string): Promise<void> {
  const db = await getDb();
  if (exceptToken) {
    await db
      .delete(sessions)
      .where(and(eq(sessions.userId, userId), ne(sessions.tokenHash, hashToken(exceptToken))));
    return;
  }
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

function toSessionUser(row: typeof users.$inferSelect): SessionUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatarUrl,
    bio: row.bio,
    timezone: row.timezone,
    preferences: (row.preferences ?? {}) as UserPreferences,
    createdAt: row.createdAt,
  };
}

/**
 * Reads the current user from the session cookie.
 *
 * Returns null rather than throwing so that pages can choose between
 * redirecting and rendering a public view.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) {
    // No cookie at all: in single-user mode that is expected, not an error.
    return getSingleUser();
  }

  const db = await getDb();
  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row) {
    // Expired or revoked session — fall back to the local owner in single-user
    // mode so the app remains usable.
    return getSingleUser();
  }

  // Sliding expiry: extend long-lived sessions so an active writer is never
  // logged out mid-sentence.
  const expiresAt = new Date(Date.now() + getEnv().SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db
    .update(sessions)
    .set({ lastUsedAt: new Date(), expiresAt })
    .where(eq(sessions.tokenHash, hashToken(token)));

  return toSessionUser(row.user);
}

/** Same as `getCurrentUser` but redirects to `/login` when signed out. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
