import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/session";
import { DEFAULT_CHAPTERS } from "@/lib/catalog/chapters";
import { DEFAULT_PROMPTS } from "@/lib/catalog/prompts";

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-dvh bg-parchment-100 dark:bg-[#100e0c]">
      <header className="sticky top-0 z-30 border-b border-parchment-300/70 bg-parchment-100/85 backdrop-blur dark:border-white/10 dark:bg-[#100e0c]/85">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-900 text-parchment-100 dark:bg-parchment-100 dark:text-ink-900">
              <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" aria-hidden="true">
                <path
                  d="M5 4.5A1.5 1.5 0 0 1 6.5 3H18a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6.5A1.5 1.5 0 0 1 5 19.5v-15Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.5 8h7M8.5 12h7M8.5 16h4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="font-serif text-lg font-semibold tracking-tight text-ink-900 dark:text-parchment-100">
              Everstory
            </span>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-3">
            <a
              href="#how-it-works"
              className="hidden px-3 py-2 text-sm text-ink-600 transition hover:text-ink-900 sm:block dark:text-parchment-400 dark:hover:text-parchment-100"
            >
              How it works
            </a>
            <a
              href="#privacy"
              className="hidden px-3 py-2 text-sm text-ink-600 transition hover:text-ink-900 sm:block dark:text-parchment-400 dark:hover:text-parchment-100"
            >
              Privacy
            </a>
            {user ? (
              <Link
                href="/dashboard"
                className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-parchment-50 transition hover:bg-ink-700 dark:bg-parchment-100 dark:text-ink-900 dark:hover:bg-white"
              >
                Open my story
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-parchment-200 dark:text-parchment-200 dark:hover:bg-white/10"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-parchment-50 transition hover:bg-ink-700 dark:bg-parchment-100 dark:text-ink-900 dark:hover:bg-white"
                >
                  Start writing
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* ------------------------------------------------------------ hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[52rem] -translate-x-1/2 rounded-full bg-brass-300/25 blur-3xl dark:bg-brass-700/20"
          />
          <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-16 sm:pb-24 sm:pt-24">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-parchment-400/70 bg-parchment-200/60 px-3 py-1 text-xs font-medium tracking-wide text-ink-600 uppercase dark:border-white/10 dark:bg-white/5 dark:text-parchment-400">
              <span className="h-1.5 w-1.5 rounded-full bg-brass-500" />
              Your story, kept forever
            </p>

            <h1 className="max-w-3xl font-serif text-4xl leading-[1.08] font-semibold tracking-tight text-ink-900 text-balance sm:text-6xl dark:text-parchment-50">
              The story only you can tell
              <span className="text-brass-600 dark:text-brass-300"> deserves more than a shoebox.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-600 text-pretty dark:text-parchment-400">
              Everstory asks you one good question at a time and keeps your answers safe. Not a social
              network. Not a journaling app chasing a streak. A quiet place to leave the things that would
              otherwise be lost.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href={user ? "/dashboard" : "/signup"}
                className="rounded-xl bg-ink-900 px-6 py-3 text-sm font-semibold text-parchment-50 shadow-lift transition hover:bg-ink-700 dark:bg-parchment-100 dark:text-ink-900 dark:hover:bg-white"
              >
                {user ? "Continue writing" : "Begin for free"}
              </Link>
              <a
                href="#how-it-works"
                className="rounded-xl border border-parchment-400 bg-parchment-200/50 px-6 py-3 text-sm font-semibold text-ink-800 transition hover:bg-parchment-200 dark:border-white/10 dark:bg-white/5 dark:text-parchment-100 dark:hover:bg-white/10"
              >
                See how it works
              </a>
            </div>

            <dl className="mt-14 grid max-w-2xl grid-cols-3 gap-6 border-t border-parchment-300 pt-8 dark:border-white/10">
              {[
                { value: `${DEFAULT_PROMPTS.length}`, label: "Guided prompts" },
                { value: `${DEFAULT_CHAPTERS.length}`, label: "Life chapters" },
                { value: "4", label: "Export formats" },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="font-serif text-3xl font-semibold text-ink-900 dark:text-parchment-50">
                    {stat.value}
                  </dt>
                  <dd className="mt-1 text-sm text-ink-500 dark:text-parchment-400">{stat.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* --------------------------------------------------- how it works */}
        <section
          id="how-it-works"
          className="border-y border-parchment-300 bg-parchment-200/40 dark:border-white/10 dark:bg-white/[0.02]"
        >
          <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl dark:text-parchment-50">
              Three steps, no blank page
            </h2>
            <p className="mt-3 max-w-xl text-ink-600 dark:text-parchment-400">
              The hardest part of writing a memoir is knowing where to begin. Everstory hands you the first
              sentence.
            </p>

            <ol className="mt-12 grid gap-6 sm:grid-cols-3">
              {[
                {
                  n: "01",
                  title: "Pick a prompt",
                  body: "Ninety questions organised by chapter, written so they cannot be answered in one word. Start anywhere.",
                },
                {
                  n: "02",
                  title: "Write like you talk",
                  body: "A calm, full-screen editor that autosaves. Photos, dates, places and the people involved attach to the memory itself.",
                },
                {
                  n: "03",
                  title: "Keep it, share it, export it",
                  body: "Your writing is private by default. Publish a single chapter with a link, or export the whole book as PDF, EPUB, Markdown or JSON.",
                },
              ].map((step) => (
                <li
                  key={step.n}
                  className="rounded-2xl border border-parchment-300 bg-parchment-50 p-6 shadow-page dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <span className="font-mono text-xs font-semibold tracking-widest text-brass-600 dark:text-brass-300">
                    {step.n}
                  </span>
                  <h3 className="mt-3 font-serif text-xl font-semibold text-ink-900 dark:text-parchment-50">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-parchment-400">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* -------------------------------------------------------- privacy */}
        <section id="privacy" className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="font-serif text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl dark:text-parchment-50">
                Yours. Actually yours.
              </h2>
              <p className="mt-4 text-ink-600 dark:text-parchment-400">
                Most writing tools are free because you are the product. Everstory is open source and
                self-hostable, so the arrangement is simple: the software is yours to run, and the words are
                yours alone.
              </p>

              <ul className="mt-8 space-y-4">
                {[
                  "Private by default — nothing is public until you publish it",
                  "Your data lives in a database you control, or on your own disk",
                  "Export everything, any time, in formats you can still open in 2050",
                  "No analytics on your writing, no model training, no ad partners",
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-ink-700 dark:text-parchment-300">
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="mt-0.5 h-5 w-5 shrink-0 text-brass-500"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-parchment-300 bg-parchment-50 p-7 shadow-page dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-mono text-xs tracking-widest text-ink-400 uppercase">Run it yourself</p>
              <pre className="mt-4 overflow-x-auto rounded-lg bg-ink-900 p-4 text-[13px] leading-relaxed text-parchment-200">
                <code>{`git clone https://github.com/amoldeole/Everstory-My-Untold-Legacy
cd Everstory-My-Untold-Legacy
npm install
npm run db:migrate
npm run db:seed -- --demo
npm run dev`}</code>
              </pre>
              <p className="mt-4 text-sm text-ink-600 dark:text-parchment-400">
                No database server to install. Everstory ships with an embedded Postgres that runs on macOS,
                Windows and Linux. Point <code className="font-mono text-[13px]">DATABASE_URL</code> at a real
                server when you deploy.
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ CTA */}
        <section className="border-t border-parchment-300 dark:border-white/10">
          <div className="mx-auto max-w-6xl px-5 py-16 text-center sm:py-24">
            <blockquote className="mx-auto max-w-2xl font-serif text-2xl leading-snug text-ink-800 text-balance sm:text-3xl dark:text-parchment-100">
              “Everyone has a story they keep meaning to write down. The tragedy is not that people forget —
              it is that nobody ever asked.”
            </blockquote>
            <div className="mt-10">
              <Link
                href={user ? "/dashboard" : "/signup"}
                className="inline-block rounded-xl bg-ink-900 px-8 py-3.5 text-sm font-semibold text-parchment-50 shadow-lift transition hover:bg-ink-700 dark:bg-parchment-100 dark:text-ink-900 dark:hover:bg-white"
              >
                {user ? "Open my story" : "Start your Everstory"}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-parchment-300 py-10 dark:border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 sm:flex-row">
          <p className="text-sm text-ink-500 dark:text-parchment-400">
            Everstory — My Untold Legacy. Built to outlive us.
          </p>
          <div className="flex gap-5 text-sm text-ink-500 dark:text-parchment-400">
            <Link href="/login" className="transition hover:text-ink-900 dark:hover:text-parchment-100">
              Sign in
            </Link>
            <a
              href="https://github.com/amoldeole/Everstory-My-Untold-Legacy"
              className="transition hover:text-ink-900 dark:hover:text-parchment-100"
              rel="noreferrer noopener"
              target="_blank"
            >
              Source
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
