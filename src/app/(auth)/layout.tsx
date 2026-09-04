import Link from "next/link";
import { redirect } from "next/navigation";

import { EverstoryMark } from "@/components/brand/ProviderIcons";
import { getCurrentUser } from "@/lib/auth/session";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="relative flex min-h-dvh flex-col bg-parchment-100 dark:bg-[#100e0c]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-brass-300/20 blur-3xl dark:bg-brass-700/15"
      />
      <header className="relative px-5 py-6">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-900 text-parchment-100 dark:bg-parchment-100 dark:text-ink-900">
            <EverstoryMark className="h-4.5 w-4.5" />
          </span>
          <span className="font-serif text-lg font-semibold text-ink-900 dark:text-parchment-100">
            Everstory
          </span>
        </Link>
      </header>

      <main className="relative flex flex-1 items-start justify-center px-5 pb-16 pt-4 sm:items-center sm:pt-0">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-parchment-300 bg-parchment-50 p-7 shadow-lift sm:p-8 dark:border-white/10 dark:bg-white/[0.04]">
            {children}
          </div>
          <p className="mt-6 text-center text-xs text-ink-400 dark:text-parchment-500">
            Your words stay yours. Private by default, exportable any time.
          </p>
        </div>
      </main>
    </div>
  );
}
