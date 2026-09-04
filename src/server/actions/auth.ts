"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import {
  assertPasswordPolicy,
  hashPassword,
  isPasswordPolicyError,
  verifyPassword,
} from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";

export interface AuthFormState {
  error?: string;
  values?: { email?: string; name?: string };
}

const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .pipe(z.email("That does not look like an email address.")),
  password: z.string().min(1, "Enter your password."),
});

const signUpSchema = credentialsSchema.extend({
  name: z.string().trim().min(1, "Tell us what to call you.").max(80, "That name is a little long."),
});

async function requestMeta(): Promise<{ userAgent: string | null; ipAddress: string | null }> {
  const headerList = await headers();
  return {
    userAgent: headerList.get("user-agent"),
    // Trust the first hop of `x-forwarded-for`; behind a proxy this is the
    // client. We only use it for display, never for authorisation.
    ipAddress: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  };
}

export async function signInAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
  const parsed = credentialsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the form and try again.",
      values: { email: raw.email },
    };
  }

  const db = await getDb();
  const found = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email.toLowerCase()))
    .limit(1);

  const user = found[0];

  // Always run a verification so that a missing account and a wrong password
  // take roughly the same time to reject.
  const placeholderHash = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAA";
  const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? placeholderHash);

  if (!user || !ok) {
    return { error: "That email and password do not match an account.", values: { email: raw.email } };
  }

  if (!user.passwordHash) {
    return {
      error: "This account signs in with a connected provider. Use the provider button below.",
      values: { email: raw.email },
    };
  }

  await db.update(users).set({ lastActiveAt: new Date() }).where(eq(users.id, user.id));
  await createSession(user.id, await requestMeta());

  const next = String(formData.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}

export async function signUpAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!getEnv().ALLOW_SIGNUP) {
    return { error: "New accounts are closed on this installation." };
  }

  const raw = {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };

  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the form and try again.",
      values: { email: raw.email, name: raw.name },
    };
  }

  try {
    assertPasswordPolicy(parsed.data.password);
  } catch (error) {
    if (isPasswordPolicyError(error)) {
      return { error: error.message, values: { email: raw.email, name: raw.name } };
    }
    throw error;
  }

  const email = parsed.data.email.toLowerCase();
  const db = await getDb();

  const duplicate = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (duplicate.length > 0) {
    return {
      error: "An account with that email already exists.",
      values: { email: raw.email, name: raw.name },
    };
  }

  const [created] = await db
    .insert(users)
    .values({
      email,
      name: parsed.data.name,
      passwordHash: await hashPassword(parsed.data.password),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    })
    .returning({ id: users.id });

  if (!created) {
    return {
      error: "Could not create the account. Please try again.",
      values: { email: raw.email, name: raw.name },
    };
  }

  // Chapters are created here rather than inside `createUserWithDefaults`
  // because we return the id directly from the insert above.
  const { createDefaultChapters } = await import("@/lib/onboarding");
  await createDefaultChapters(db, created.id);

  await createSession(created.id, await requestMeta());
  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
