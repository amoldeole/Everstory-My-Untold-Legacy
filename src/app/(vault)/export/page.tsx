import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";

import { Card, CardHeader, PageHeader } from "@/components/ui/Primitives";
import { getDb } from "@/db";
import { exports as exportsTable } from "@/db/schema";
import { DownloadIcon } from "@/components/layout/NavIcons";
import { requireUser } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import { buildBook } from "@/lib/export/book";
import { formatBytes } from "@/lib/utils/text";

export const metadata: Metadata = { title: "Export" };
export const dynamic = "force-dynamic";

const FORMATS = [
  {
    id: "epub",
    name: "EPUB",
    blurb:
      "A real ebook with a table of contents. Opens in Apple Books, Kindle (via Send to Kindle), Calibre, and every e-reader.",
    extension: ".epub",
    recommended: true,
  },
  {
    id: "html",
    name: "HTML (print to PDF)",
    blurb:
      "A single self-contained file. Open it, press Print, choose “Save as PDF”. No PDF library, no quality loss.",
    extension: ".html",
  },
  {
    id: "markdown",
    name: "Markdown",
    blurb: "Plain text you can open in any editor, forever. The most future-proof option there is.",
    extension: ".md",
  },
  {
    id: "json",
    name: "JSON (full archive)",
    blurb:
      "Every field, including dates, moods, tags, people and photo references. Use it to move somewhere else.",
    extension: ".json",
  },
];

export default async function ExportPage() {
  const user = await requireUser();
  const db = await getDb();

  const [book, history] = await Promise.all([
    buildBook(user.id),
    db
      .select()
      .from(exportsTable)
      .where(eq(exportsTable.userId, user.id))
      .orderBy(desc(exportsTable.createdAt))
      .limit(8),
  ]);

  void getEnv;

  const query = "?drafts=true&private=true";

  return (
    <>
      <PageHeader
        eyebrow="Your words, your files"
        title="Export your Everstory"
        description="Everything you have written, in formats you will still be able to open in fifty years. No lock-in, no export limits, no waiting for a review."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          {FORMATS.map((format) => (
            <Card key={format.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif text-lg font-semibold text-ink-900 dark:text-parchment-50">
                      {format.name}
                    </h2>
                    {format.recommended ? (
                      <span className="rounded-full bg-brass-300/50 px-2 py-0.5 text-[11px] font-medium text-brass-700 dark:bg-brass-700/30 dark:text-brass-300">
                        Recommended
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-ink-600 dark:text-parchment-400">
                    {format.blurb}
                  </p>
                </div>
                <a
                  href={`/api/export/${format.id}${query}`}
                  className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-ink-900 px-4 text-sm font-medium text-parchment-50 transition hover:bg-ink-700 dark:bg-parchment-100 dark:text-ink-900 dark:hover:bg-white"
                >
                  <DownloadIcon className="h-4 w-4" />
                  Download {format.extension}
                </a>
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-[11px] tracking-widest text-ink-500 uppercase dark:text-parchment-500">
              What you will get
            </p>
            <dl className="mt-3 space-y-2.5">
              {[
                { label: "Entries", value: book.totals.entries.toLocaleString() },
                { label: "Words", value: book.totals.words.toLocaleString() },
                { label: "Chapters", value: book.totals.chapters.toLocaleString() },
                { label: "Photos", value: book.totals.photos.toLocaleString() },
                { label: "Milestones", value: book.milestones.length.toLocaleString() },
              ].map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-[13px] text-ink-600 dark:text-parchment-400">{row.label}</dt>
                  <dd className="font-serif text-lg font-semibold text-ink-900 dark:text-parchment-50">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="font-serif text-base font-semibold text-ink-900 dark:text-parchment-50">
              A note on PDF
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-600 dark:text-parchment-400">
              Everstory does not generate PDFs directly. Instead, download the HTML file and use your
              browser&apos;s Print → Save as PDF. It produces better typography than any library we could
              bundle, and it works identically on macOS, Windows and Linux.
            </p>
          </Card>

          {history.length > 0 ? (
            <Card>
              <CardHeader title="Recent exports" />
              <ul className="divide-y divide-parchment-300 dark:divide-white/8">
                {history.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] text-ink-800 dark:text-parchment-100">
                        {item.filename}
                      </p>
                      <p className="text-[11px] text-ink-500 dark:text-parchment-500">
                        {item.createdAt.toISOString().slice(0, 10)} · {formatBytes(item.byteSize)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
