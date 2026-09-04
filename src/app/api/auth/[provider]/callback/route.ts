import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { accounts, users } from "@/db/schema";
import { OAUTH_STATE_COOKIE, getProvider } from "@/lib/auth/oauth";
import { createSession } from "@/lib/auth/session";
import { getAppUrl, getEnv } from "@/lib/env";
import { createDefaultChapters } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

function fail(reason: string): NextResponse {
  return NextResponse.redirect(new URL(`/login?error=${reason}`, getAppUrl()));
}

/**
 * Completes an OAuth flow: verifies `state`, exchanges the code, then finds or
 * creates the local account.
 *
 * When an account already exists with the same email, we link the provider to
 * it rather than creating a duplicate. This is the behaviour people expect,
 * and it is safe here because the providers we support verify email addresses.
 */
export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider: providerId } = await context.params;
  const provider = getProvider(providerId);

  if (!provider || !provider.isConfigured()) return fail("oauth_unavailable");

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) return fail("oauth_denied");
  if (!code || !state) return fail("oauth_incomplete");

  const store = await cookies();
  const rawState = store.get(OAUTH_STATE_COOKIE)?.value;
  store.delete(OAUTH_STATE_COOKIE);

  if (!rawState) return fail("oauth_expired");

  let expected: { state: string; verifier: string | null; next: string | null };
  try {
    expected = JSON.parse(rawState) as typeof expected;
  } catch {
    return fail("oauth_invalid");
  }

  if (expected.state !== state) return fail("oauth_invalid");

  let profile;
  try {
    const tokens = await provider.exchangeCode({
      code,
      redirectUri: `${getAppUrl()}/api/auth/${provider.id}/callback`,
      codeVerifier: expected.verifier ?? undefined,
    });
    profile = await provider.fetchProfile(tokens.accessToken);
  } catch {
    return fail("oauth_failed");
  }

  if (!profile.providerAccountId) return fail("oauth_failed");

  const db = await getDb();

  // Already linked to this provider?
  const linked = await db
    .select({ userId: accounts.userId })
    .from(accounts)
    .where(and(eq(accounts.provider, provider.id), eq(accounts.providerAccountId, profile.providerAccountId)))
    .limit(1);

  let userId = linked[0]?.userId;

  if (!userId && profile.email) {
    const byEmail = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, profile.email.toLowerCase()))
      .limit(1);
    userId = byEmail[0]?.id;

    if (userId) {
      await db.insert(accounts).values({
        userId,
        provider: provider.id,
        providerAccountId: profile.providerAccountId,
        email: profile.email,
      });
    }
  }

  if (!userId) {
    if (!getEnv().ALLOW_SIGNUP) return fail("signup_closed");

    const [created] = await db
      .insert(users)
      .values({
        email: (profile.email ?? `${profile.providerAccountId}@${provider.id}.local`).toLowerCase(),
        name: profile.name ?? "New writer",
        avatarUrl: profile.avatarUrl,
        passwordHash: null,
      })
      .returning({ id: users.id });

    if (!created) return fail("oauth_failed");
    userId = created.id;

    await db.insert(accounts).values({
      userId,
      provider: provider.id,
      providerAccountId: profile.providerAccountId,
      email: profile.email,
    });

    await createDefaultChapters(db, userId);
  }

  await createSession(userId, {
    userAgent: request.headers.get("user-agent"),
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  });

  const destination = expected.next?.startsWith("/") ? expected.next : "/dashboard";
  return NextResponse.redirect(new URL(destination, getAppUrl()));
}
