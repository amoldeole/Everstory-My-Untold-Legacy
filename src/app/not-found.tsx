import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-parchment-100 px-5 text-center dark:bg-[#100e0c]">
      <p className="font-mono text-[11px] tracking-widest text-brass-600 uppercase dark:text-brass-300">
        404
      </p>
      <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-ink-900 dark:text-parchment-50">
        This page was never written
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-600 dark:text-parchment-400">
        The page you are looking for does not exist. If it was a shared memory, the link may have been turned
        off by its author.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/"
          className="rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-medium text-parchment-50 transition hover:bg-ink-700 dark:bg-parchment-100 dark:text-ink-900"
        >
          Go home
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-parchment-400 px-5 py-2.5 text-sm font-medium text-ink-800 transition hover:bg-parchment-200 dark:border-white/12 dark:text-parchment-100 dark:hover:bg-white/10"
        >
          My story
        </Link>
      </div>
    </div>
  );
}
