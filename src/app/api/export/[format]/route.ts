import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { entries, exports as exportsTable } from "@/db/schema";
import { authenticate, apiError, rateLimit } from "@/server/api/helpers";
import { buildBook, DEFAULT_EXPORT_OPTIONS } from "@/lib/export/book";
import { renderMarkdownBook, renderHtmlBook, renderJsonBook } from "@/lib/export/renderers";
import { renderEpubBook } from "@/lib/export/epub";
import { toFileStem } from "@/lib/utils/text";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FORMATS = {
  markdown: { extension: "md", contentType: "text/markdown; charset=utf-8" },
  html: { extension: "html", contentType: "text/html; charset=utf-8" },
  json: { extension: "json", contentType: "application/json; charset=utf-8" },
  epub: { extension: "epub", contentType: "application/epub+zip" },
} as const;

type Format = keyof typeof FORMATS;

function isFormat(value: string): value is Format {
  return value in FORMATS;
}

export async function GET(request: Request, context: { params: Promise<{ format: string }> }) {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;

  const limit = rateLimit(`export:${auth.user.id}`, 20, 60_000);
  if (!limit.ok) return apiError("Too many exports. Wait a minute and try again.", 429);

  const { format } = await context.params;
  if (!isFormat(format)) {
    return apiError(`Unknown format "${format}". Use markdown, html, json or epub.`, 404);
  }

  const url = new URL(request.url);
  const options = {
    ...DEFAULT_EXPORT_OPTIONS,
    includeDrafts: url.searchParams.get("drafts") !== "false",
    includePrivate: url.searchParams.get("private") !== "false",
    title: url.searchParams.get("title") ?? undefined,
  };

  const book = await buildBook(auth.user.id, options);
  const meta = FORMATS[format];

  let body: string | Buffer;
  switch (format) {
    case "markdown":
      body = renderMarkdownBook(book);
      break;
    case "html":
      body = renderHtmlBook(book);
      break;
    case "json":
      body = renderJsonBook(book);
      break;
    case "epub":
      body = await renderEpubBook(book);
      break;
  }

  const bytes = typeof body === "string" ? Buffer.byteLength(body, "utf8") : body.byteLength;
  const filename = `${toFileStem(book.title)}-${book.generatedAt.toISOString().slice(0, 10)}.${meta.extension}`;

  // Record the export so Settings can show what has been taken off the platform.
  try {
    const db = await getDb();
    const entryCountRows = await db
      .select({ id: entries.id })
      .from(entries)
      .where(and(eq(entries.userId, auth.user.id)));
    await db.insert(exportsTable).values({
      userId: auth.user.id,
      format,
      status: "ready",
      filename,
      byteSize: bytes,
      entryCount: entryCountRows.length,
    });
  } catch {
    // History is a nicety, not a requirement — never fail an export over it.
  }

  return new Response(typeof body === "string" ? body : new Uint8Array(body), {
    status: 200,
    headers: {
      "content-type": meta.contentType,
      "content-length": String(bytes),
      "content-disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "cache-control": "no-store",
    },
  });
}
