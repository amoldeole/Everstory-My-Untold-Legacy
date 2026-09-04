import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { generatePkce, generateState, OAUTH_STATE_COOKIE, getProvider } from "@/lib/auth/oauth";
import { getAppUrl, getEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Starts an OAuth flow.
 *
 * We keep the CSRF `state` and the PKCE verifier in a short-lived cookie
 * instead of a server-side store, so the app stays stateless — which is what
 * lets it run on serverless platforms without a session backend.
 */
export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider: providerId } = await context.params;
  const provider = getProvider(providerId);

  if (!provider || !provider.isConfigured()) {
    return NextResponse.redirect(new URL("/login?error=oauth_unavailable", getEnv().NEXT_PUBLIC_APP_URL));
  }

  const url = new URL(request.url);
  const next = url.searchParams.get("next");
  const redirectUri = `${getAppUrl()}/api/auth/${provider.id}/callback`;

  const state = generateState();
  const pkce = provider.usesPkce ? generatePkce() : null;

  const store = await cookies();
  store.set(
    OAUTH_STATE_COOKIE,
    JSON.stringify({ state, verifier: pkce?.verifier ?? null, next: next ?? null }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: getEnv().NODE_ENV === "production",
      path: "/",
      maxAge: 600, // ten minutes is plenty to complete a login
    },
  );

  const authorizeUrl = provider.buildAuthorizeUrl({
    redirectUri,
    state,
    codeChallenge: pkce?.challenge,
  });

  return NextResponse.redirect(authorizeUrl);
}
