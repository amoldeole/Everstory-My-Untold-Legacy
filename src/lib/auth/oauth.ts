import { createHash, randomBytes } from "node:crypto";

import { getEnv } from "@/lib/env";

export type OAuthProviderId = "google" | "github";

export interface OAuthProfile {
  providerAccountId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
}

export interface OAuthProvider {
  id: OAuthProviderId;
  label: string;
  /** Providers only appear in the UI once their credentials are configured. */
  isConfigured(): boolean;
  usesPkce: boolean;
  buildAuthorizeUrl(args: { redirectUri: string; state: string; codeChallenge?: string }): string;
  exchangeCode(args: { code: string; redirectUri: string; codeVerifier?: string }): Promise<OAuthTokens>;
  fetchProfile(accessToken: string): Promise<OAuthProfile>;
}

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function formBody(params: Record<string, string | undefined>): string {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value as string)}`)
    .join("&");
}

const google: OAuthProvider = {
  id: "google",
  label: "Google",
  usesPkce: true,
  isConfigured() {
    const env = getEnv();
    return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  },
  buildAuthorizeUrl({ redirectUri, state, codeChallenge }) {
    const env = getEnv();
    const params = new URLSearchParams({
      client_id: required(env.GOOGLE_CLIENT_ID, "GOOGLE_CLIENT_ID"),
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "offline",
      prompt: "select_account",
    });
    if (codeChallenge) {
      params.set("code_challenge", codeChallenge);
      params.set("code_challenge_method", "S256");
    }
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },
  async exchangeCode({ code, redirectUri, codeVerifier }) {
    const env = getEnv();
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: formBody({
        code,
        client_id: required(env.GOOGLE_CLIENT_ID, "GOOGLE_CLIENT_ID"),
        client_secret: required(env.GOOGLE_CLIENT_SECRET, "GOOGLE_CLIENT_SECRET"),
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: codeVerifier,
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Google token exchange failed (${response.status})`);
    }
    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
    };
  },
  async fetchProfile(accessToken) {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Google profile fetch failed (${response.status})`);
    const data = (await response.json()) as {
      sub: string;
      email?: string;
      name?: string;
      picture?: string;
    };
    return {
      providerAccountId: data.sub,
      email: data.email?.toLowerCase() ?? null,
      name: data.name ?? null,
      avatarUrl: data.picture ?? null,
    };
  },
};

const github: OAuthProvider = {
  id: "github",
  label: "GitHub",
  // GitHub does not support PKCE for OAuth apps; `state` carries our CSRF
  // protection instead.
  usesPkce: false,
  isConfigured() {
    const env = getEnv();
    return Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
  },
  buildAuthorizeUrl({ redirectUri, state }) {
    const env = getEnv();
    const params = new URLSearchParams({
      client_id: required(env.GITHUB_CLIENT_ID, "GITHUB_CLIENT_ID"),
      redirect_uri: redirectUri,
      scope: "user:email",
      state,
      allow_signup: "true",
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  },
  async exchangeCode({ code, redirectUri }) {
    const env = getEnv();
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: formBody({
        code,
        client_id: required(env.GITHUB_CLIENT_ID, "GITHUB_CLIENT_ID"),
        client_secret: required(env.GITHUB_CLIENT_SECRET, "GITHUB_CLIENT_SECRET"),
        redirect_uri: redirectUri,
      }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`GitHub token exchange failed (${response.status})`);
    const data = (await response.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!data.access_token) {
      throw new Error(data.error_description ?? data.error ?? "GitHub token exchange failed");
    }
    return { accessToken: data.access_token };
  },
  async fetchProfile(accessToken) {
    const headers = {
      authorization: `Bearer ${accessToken}`,
      accept: "application/vnd.github+json",
      "user-agent": "everstory",
    };
    const response = await fetch("https://api.github.com/user", { headers, cache: "no-store" });
    if (!response.ok) throw new Error(`GitHub profile fetch failed (${response.status})`);
    const data = (await response.json()) as {
      id: number;
      login: string;
      name?: string | null;
      email?: string | null;
      avatar_url?: string;
    };

    let email = data.email?.toLowerCase() ?? null;
    if (!email) {
      const emails = await fetch("https://api.github.com/user/emails", { headers, cache: "no-store" });
      if (emails.ok) {
        const list = (await emails.json()) as Array<{ email: string; primary: boolean; verified: boolean }>;
        email = list.find((entry) => entry.primary && entry.verified)?.email?.toLowerCase() ?? null;
      }
    }

    return {
      providerAccountId: String(data.id),
      email,
      name: data.name ?? data.login,
      avatarUrl: data.avatar_url ?? null,
    };
  },
};

const providers: Record<OAuthProviderId, OAuthProvider> = { google, github };

export function getProvider(id: string): OAuthProvider | null {
  return id in providers ? providers[id as OAuthProviderId] : null;
}

export function listProviders(): OAuthProvider[] {
  return Object.values(providers);
}

export function listConfiguredProviders(): OAuthProvider[] {
  return Object.values(providers).filter((provider) => provider.isConfigured());
}

export function isOAuthEnabled(): boolean {
  return listConfiguredProviders().length > 0;
}

/* ---------------------------------- PKCE ---------------------------------- */

export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function generateState(): string {
  return randomBytes(24).toString("base64url");
}

export const OAUTH_STATE_COOKIE = "everstory_oauth_state";
