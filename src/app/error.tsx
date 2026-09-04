"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production this is where you would forward to Sentry, Axiom, etc.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-parchment-100 px-5 text-center dark:bg-[#100e0c]">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink-900 dark:text-parchment-50">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-600 dark:text-parchment-400">
        Your writing is safe — this page just failed to load. Try again, and if it keeps happening, check the
        server logs.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-[11px] text-ink-400 dark:text-parchment-600">
          Reference: {error.digest}
        </p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-medium text-parchment-50 transition hover:bg-ink-700 dark:bg-parchment-100 dark:text-ink-900"
      >
        Try again
      </button>
    </div>
  );
}
