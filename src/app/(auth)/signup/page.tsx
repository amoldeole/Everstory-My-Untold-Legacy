import type { Metadata } from "next";

import { AuthForm, type OAuthButtonDescriptor } from "@/components/auth/AuthForm";
import { GitHubIcon, GoogleIcon } from "@/components/brand/ProviderIcons";
import { listConfiguredProviders } from "@/lib/auth/oauth";
import { getEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "Create your Everstory",
  description: "Start writing the story only you can tell.",
};

const ICONS: Record<string, (props: { className?: string }) => React.ReactElement> = {
  google: GoogleIcon,
  github: GitHubIcon,
};

export default async function SignupPage() {
  const env = getEnv();

  const providers: OAuthButtonDescriptor[] = listConfiguredProviders().map((provider) => ({
    id: provider.id,
    label: provider.label,
    href: `/api/auth/${provider.id}`,
    Icon: ICONS[provider.id] ?? GoogleIcon,
  }));

  return (
    <>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink-900 dark:text-parchment-50">
          Begin your Everstory
        </h1>
        <p className="mt-1.5 text-sm text-ink-600 dark:text-parchment-400">
          Fifteen chapters, ninety prompts, and as much time as you need.
        </p>
      </div>

      <AuthForm mode="signup" oauthProviders={providers} allowSignup={env.ALLOW_SIGNUP} />
    </>
  );
}
