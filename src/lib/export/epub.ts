import JSZip from "jszip";

import { getStorage } from "@/lib/storage";
import { escapeHtml } from "@/lib/markdown";

import type { Book, BookEntry } from "./book";

/**
 * EPUB 3 writer.
 *
 * An EPUB is a ZIP archive with a well-defined layout, which means we can
 * produce one with nothing but a zip library — no native dependencies, so it
 * builds identically on macOS, Windows and Linux.
 *
 * Layout:
 *   mimetype                (stored uncompressed, must be the first entry)
 *   META-INF/container.xml
 *   OEBPS/content.opf       (the manifest)
 *   OEBPS/nav.xhtml         (the table of contents)
 *   OEBPS/style.css
 *   OEBPS/title.xhtml
 *   OEBPS/chapter-*.xhtml
 *   OEBPS/images/*          (embedded so the file is self-contained)
 */

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

interface EmbeddedImage {
  href: string;
  id: string;
  mediaType: string;
}

export async function renderEpubBook(book: Book): Promise<Buffer> {
  const zip = new JSZip();

  // Must be first and uncompressed, per the EPUB specification.
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
  );

  zip.file("OEBPS/style.css", epubStyles());

  // ---------------------------------------------------------------- images
  const images: EmbeddedImage[] = [];
  const storage = getStorage();
  let imageIndex = 0;

  for (const chapter of book.chapters) {
    for (const entry of chapter.entries) {
      for (const photo of entry.photos) {
        const extension = IMAGE_EXTENSIONS[photo.mimeType];
        if (!extension) continue;
        try {
          const object = await storage.get(photo.storageKey);
          if (!object) continue;
          imageIndex += 1;
          const href = `images/img-${imageIndex}${extension}`;
          zip.file(`OEBPS/${href}`, object.body);
          images.push({ href, id: `img-${imageIndex}`, mediaType: photo.mimeType });
          // Remember where the image landed so we can rewrite <img> tags.
          imageHrefByPhotoId.set(photo.id, href);
        } catch {
          // A missing image must not fail the whole export.
        }
      }
    }
  }

  // ------------------------------------------------------------ title page
  zip.file("OEBPS/title.xhtml", xhtmlDocument("Title", titlePage(book)));

  // --------------------------------------------------------------- chapters
  const manifestItems: string[] = [
    `<item id="nav" href="nav.xhtml" properties="nav" media-type="application/xhtml+xml"/>`,
    `<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>`,
    `<item id="css" href="style.css" media-type="text/css"/>`,
  ];
  const spineItems: string[] = [`<itemref idref="title"/>`];
  const navPoints: string[] = [];

  let chapterIndex = 0;
  for (const chapter of book.chapters) {
    chapterIndex += 1;
    const fileName = `chapter-${chapterIndex}.xhtml`;
    const body = chapterDocument(chapter, book);

    zip.file(`OEBPS/${fileName}`, xhtmlDocument(chapter.title, body));

    manifestItems.push(
      `<item id="ch-${chapterIndex}" href="${fileName}" media-type="application/xhtml+xml"/>`,
    );
    spineItems.push(`<itemref idref="ch-${chapterIndex}"/>`);
    navPoints.push(
      `      <li><a href="${fileName}">${escapeHtml(chapter.emoji)} ${escapeHtml(chapter.title)}</a></li>`,
    );
  }

  for (const image of images) {
    manifestItems.push(`<item id="${image.id}" href="${image.href}" media-type="${image.mediaType}"/>`);
  }

  zip.file(
    "OEBPS/content.opf",
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">urn:uuid:${bookId(book)}</dc:identifier>
    <dc:title>${escapeHtml(book.title)}</dc:title>
    <dc:creator>${escapeHtml(book.author)}</dc:creator>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">${book.generatedAt.toISOString().replace(/\.\d{3}Z$/, "Z")}</meta>
  </metadata>
  <manifest>
    ${manifestItems.join("\n    ")}
  </manifest>
  <spine>
    ${spineItems.join("\n    ")}
  </spine>
</package>`,
  );

  zip.file(
    "OEBPS/nav.xhtml",
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Contents</title><link rel="stylesheet" href="style.css"/></head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Contents</h1>
    <ol>
${navPoints.join("\n")}
    </ol>
  </nav>
</body>
</html>`,
  );

  imageHrefByPhotoId.clear();

  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    mimeType: "application/epub+zip",
  });

  return buffer;
}

/* ------------------------------------------------------------------ helpers */

/**
 * Maps photo id -> path inside the archive. Local to `renderEpubBook` in
 * spirit; module scope keeps the closure signature simple, and it is cleared
 * before the archive is generated so concurrent exports cannot leak into
 * each other's <img> rewriting.
 */
const imageHrefByPhotoId = new Map<string, string>();

function bookId(book: Book): string {
  // Deterministic-ish UUID so re-exports of the same book keep their identity
  // in a reader's library.
  const seed = `${book.author}:${book.title}`;
  let hash = 5381;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) + hash + seed.charCodeAt(index)) >>> 0;
  }
  const hex = hash.toString(16).padStart(8, "0");
  return `${hex}-0000-4000-8000-${hex}00000000`.slice(0, 36);
}

function xhtmlDocument(title: string, body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${escapeHtml(title)}</title><link rel="stylesheet" href="style.css"/></head>
<body>${body}</body>
</html>`;
}

function titlePage(book: Book): string {
  return `
  <section class="title-page">
    <h1>${escapeHtml(book.title)}</h1>
    ${book.subtitle ? `<p class="subtitle">${escapeHtml(book.subtitle)}</p>` : ""}
    <p class="byline">${escapeHtml(book.author)}</p>
    <p class="colophon">
      ${book.totals.entries} entries · ${book.totals.words.toLocaleString()} words ·
      exported from Everstory on ${book.generatedAt.toISOString().slice(0, 10)}
    </p>
  </section>`;
}

function chapterDocument(chapter: Book["chapters"][number], book: Book): string {
  void book;
  const parts: string[] = [];

  parts.push(`<section class="chapter">`);
  parts.push(`<h1>${escapeHtml(chapter.emoji)} ${escapeHtml(chapter.title)}</h1>`);
  if (chapter.description) parts.push(`<p class="chapter-desc">${escapeHtml(chapter.description)}</p>`);

  for (const entry of chapter.entries) {
    parts.push(`<div class="entry">`);
    parts.push(`<h2>${escapeHtml(entry.title)}</h2>`);
    const meta = [entry.occurredAt, entry.location, entry.mood].filter(Boolean);
    if (meta.length > 0) parts.push(`<p class="meta">${escapeHtml(meta.join(" · "))}</p>`);
    parts.push(rewriteImages(entry));
    parts.push(`</div>`);
  }

  parts.push(`</section>`);
  return parts.join("\n  ");
}

function rewriteImages(entry: BookEntry): string {
  // Swap `/api/media/<id>` URLs for the local `images/…` paths we embedded.
  return entry.html.replace(/<img[^>]+src="\/api\/media\/([^"]+)"/g, (match, id: string) => {
    const href = imageHrefByPhotoId.get(id);
    return href ? match.replace(`/api/media/${id}`, href) : match;
  });
}

function epubStyles(): string {
  return `
body { font-family: Georgia, "Times New Roman", serif; line-height: 1.6; margin: 1em; }
h1 { font-size: 1.6em; line-height: 1.25; margin: 0 0 .6em; }
h2 { font-size: 1.25em; margin: 1.8em 0 .4em; }
p { margin: 0 0 1em; text-align: justify; }
img { max-width: 100%; height: auto; margin: 1em 0; }
blockquote { margin: 1.2em 0; padding-left: 1em; border-left: 3px solid #c8a961; font-style: italic; }
.meta { font-size: .85em; font-style: italic; color: #6b5f54; }
.chapter-desc { font-style: italic; color: #6b5f54; }
.title-page { text-align: center; margin-top: 25%; }
.title-page h1 { font-size: 2.2em; }
.subtitle { font-style: italic; color: #6b5f54; }
.byline { font-size: 1.1em; margin-top: 2em; }
.colophon { font-size: .8em; color: #8d8175; margin-top: 4em; }
.entry { margin-bottom: 2.5em; }
`;
}
