import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

import type { SessionUser } from "@/lib/auth/session";

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function apiError(message: string, status = 400, details?: unknown): NextResponse {
  return NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status });
}

/**
 * Discriminated-union results.
 *
 * These narrow correctly with a plain `if (!result.ok)` check, unlike type
 * predicates over a union of object shapes (which TypeScript intersects rather
 * than filters, producing confusing errors at every call site).
 */
export type AuthResult = { ok: true; user: SessionUser } | { ok: false; response: NextResponse };
export type ParseResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

/**
 * Returns the signed-in user, or a 401 response.
 *
 * API routes deliberately return 401 rather than redirecting — a fetch call
 * cannot follow a login redirect usefully.
 */
export async function authenticate(): Promise<AuthResult> {
  const { getCurrentUser } = await import("@/lib/auth/session");
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, response: apiError("You need to sign in to do that.", 401) };
  }
  return { ok: true, user };
}

/** Parses a JSON body against a schema and turns failures into 400s. */
export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: apiError("Request body must be valid JSON.", 400) };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, response: apiError("Some fields are invalid.", 422, formatZodError(parsed.error)) };
  }
  return { ok: true, data: parsed.data };
}

export function formatZodError(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** In-memory rate limit — enough to stop accidental loops and casual abuse. */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}
