"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Alert, Field, Input } from "@/components/ui/Primitives";
import { signInAction, signUpAction, type AuthFormState } from "@/server/actions/auth";
import { cn } from "@/lib/utils/cn";

export interface OAuthButtonDescriptor {
  id: string;
  label: string;
  href: string;
  Icon: (props: { className?: string }) => React.ReactElement;
}

const STRENGTH_LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_BARS = ["bg-seal-500", "bg-seal-500", "bg-amber-500", "bg-brass-500", "bg-emerald-600"];

function PasswordStrength({ password }: { password: string }) {
  let score = 0;
  if (password.length >= 10) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^\w\s]/.test(password)) score++;
  if (password.length >= 24) score++;
  score = Math.min(4, score);

  if (!password) return null;

  return (
    <div className="mt-2 flex items-center gap-2" aria-live="polite">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              index < score ? STRENGTH_BARS[score] : "bg-parchment-300 dark:bg-white/10",
            )}
          />
        ))}
      </div>
      <span className="w-16 text-right text-[11px] text-ink-500 dark:text-parchment-400">
        {STRENGTH_LABELS[score]}
      </span>
    </div>
  );
}

export function AuthForm({
  mode,
  oauthProviders,
  allowSignup,
  next,
}: {
  mode: "login" | "signup";
  oauthProviders: OAuthButtonDescriptor[];
  allowSignup: boolean;
  next?: string;
}) {
  const isSignup = mode === "signup";
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    isSignup ? signUpAction : signInAction,
    {},
  );

  return (
    <div className="w-full">
      {state?.error ? (
        <Alert tone="error" title="Could not continue">
          {state.error}
        </Alert>
      ) : null}

      {isSignup && !allowSignup ? (
        <div className="mt-4">
          <Alert tone="warning" title="Registrations are closed">
            This installation is not accepting new accounts. Ask the owner for an invite, or run your own copy
            — Everstory is open source.
          </Alert>
        </div>
      ) : (
        <form action={formAction} className="mt-5 space-y-4">
          {next ? <input type="hidden" name="next" value={next} /> : null}

          {isSignup ? (
            <Field label="Your name" error={undefined}>
              <Input
                name="name"
                type="text"
                autoComplete="name"
                placeholder="What should we call you?"
                defaultValue={state?.values?.name}
                required
                maxLength={80}
              />
            </Field>
          ) : null}

          <Field label="Email">
            <Input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              defaultValue={state?.values?.email}
              required
              autoFocus={!isSignup}
            />
          </Field>

          <Field
            label="Password"
            hint={isSignup ? "At least 10 characters. Longer beats clever." : undefined}
          >
            <PasswordField isSignup={isSignup} />
          </Field>

          <Button type="submit" size="lg" className="w-full" disabled={pending || (isSignup && !allowSignup)}>
            {pending ? "One moment…" : isSignup ? "Create my Everstory" : "Sign in"}
          </Button>
        </form>
      )}

      {oauthProviders.length > 0 ? (
        <>
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-parchment-300 dark:bg-white/10" />
            <span className="text-[11px] tracking-widest text-ink-400 uppercase dark:text-parchment-500">
              or
            </span>
            <span className="h-px flex-1 bg-parchment-300 dark:bg-white/10" />
          </div>
          <div className="space-y-2">
            {oauthProviders.map((provider) => (
              <a
                key={provider.id}
                href={provider.href}
                className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-parchment-400 bg-parchment-50 text-sm font-medium text-ink-800 transition hover:bg-parchment-200 dark:border-white/12 dark:bg-white/5 dark:text-parchment-100 dark:hover:bg-white/10"
              >
                <provider.Icon className="h-4 w-4" />
                Continue with {provider.label}
              </a>
            ))}
          </div>
        </>
      ) : null}

      <p className="mt-7 text-center text-sm text-ink-500 dark:text-parchment-400">
        {isSignup ? "Already have an account? " : "New here? "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="font-medium text-brass-600 underline underline-offset-4 dark:text-brass-300"
        >
          {isSignup ? "Sign in" : "Start writing"}
        </Link>
      </p>
    </div>
  );
}

function PasswordField({ isSignup }: { isSignup: boolean }) {
  const [value, setValue] = useState("");
  return (
    <>
      <Input
        name="password"
        type="password"
        autoComplete={isSignup ? "new-password" : "current-password"}
        placeholder={isSignup ? "At least 10 characters" : "Your password"}
        required
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      {isSignup ? <PasswordStrength password={value} /> : null}
    </>
  );
}
