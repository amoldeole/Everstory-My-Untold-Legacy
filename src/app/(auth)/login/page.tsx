import type { Metadata } from "next";

import { AuthForm, type OAuthButtonDescriptor } from "@/components/auth/AuthForm";
import { GitHubIcon, GoogleIcon } from "@/components/brand/ProviderIcons";
import { listConfiguredProviders } from "@/lib/auth/oauth";
import { getEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to continue writing your Everstory.",
};

const ICONS: Record<string, (props: { className?: string }) => React.ReactElement> = {
  google: GoogleIcon,
  github: GitHubIcon,
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const next = typeof params.next === "string" && params.next.startsWith("/") ? params.next : undefined;

  const providers: OAuthButtonDescriptor[] = listConfiguredProviders().map((provider) => ({
    id: provider.id,
    label: provider.label,
    href: `/api/auth/${provider.id}${next ? `?next=${encodeURIComponent(next)}` : ""}`,
    Icon: ICONS[provider.id] ?? GoogleIcon,
  }));

  const singleUser = getEnv().AUTH_MODE === "single";

  return (
    <>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink-900 dark:text-parchment-50">
          {singleUser ? "You are already signed in" : "Welcome back"}
        </h1>
        <p className="mt-1.5 text-sm text-ink-600 dark:text-parchment-400">
          {singleUser
            ? "This installation runs in single-user mode, so there is nothing to sign in to."
            : "Pick up your story where you left off."}
        </p>
      </div>

      {singleUser ? (
        <a
          href="/dashboard"
          className="mt-2 flex h-11 w-full items-center justify-center rounded-lg bg-ink-900 text-sm font-semibold text-parchment-50 transition hover:bg-ink-700 dark:bg-parchment-100 dark:text-ink-900 dark:hover:bg-white"
        >
          Open my story
        </a>
      ) : (
        <AuthForm mode="login" oauthProviders={providers} allowSignup next={next} />
      )}
    </>
  );
}
