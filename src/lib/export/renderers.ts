import { escapeHtml } from "@/lib/markdown";

import type { Book } from "./book";

/* --------------------------------------------------------------- markdown -- */

export function renderMarkdownBook(book: Book): string {
  const lines: string[] = [];

  lines.push(`# ${book.title}`, "");
  if (book.subtitle) lines.push(`*${book.subtitle}*`, "");
  lines.push(
    `Written by ${book.author}. Exported from Everstory on ${book.generatedAt.toISOString().slice(0, 10)}.`,
    "",
    `---`,
    "",
  );

  for (const chapter of book.chapters) {
    lines.push(`# ${chapter.emoji} ${chapter.title}`, "");
    if (chapter.description) lines.push(`*${chapter.description}*`, "");

    for (const entry of chapter.entries) {
      lines.push(`## ${entry.title}`, "");

      const meta: string[] = [];
      if (entry.occurredAt) meta.push(entry.occurredAt);
      if (entry.location) meta.push(entry.location);
      if (entry.mood) meta.push(entry.mood);
      if (entry.status === "draft") meta.push("draft");
      if (meta.length > 0) lines.push(`_${meta.join(" · ")}_`, "");

      lines.push(entry.body.trim(), "");

      if (entry.tags.length > 0) lines.push(`Tags: ${entry.tags.join(", ")}`, "");
      if (entry.people.length > 0) lines.push(`People: ${entry.people.join(", ")}`, "");
      if (entry.photos.length > 0) {
        for (const photo of entry.photos) {
          lines.push(`![${photo.altText ?? photo.filename}](/api/media/${photo.id})`);
        }
        lines.push("");
      }
    }
  }

  if (book.milestones.length > 0) {
    lines.push(`# Timeline`, "");
    for (const milestone of book.milestones) {
      lines.push(
        `- **${milestone.occurredOn}** — ${milestone.title}${milestone.description ? ` — ${milestone.description}` : ""}`,
      );
    }
    lines.push("");
  }

  if (book.people.length > 0) {
    lines.push(`# People`, "");
    for (const person of book.people) {
      lines.push(
        `- **${person.name}**${person.relationship ? ` (${person.relationship})` : ""}${person.notes ? ` — ${person.notes}` : ""}`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

/* ------------------------------------------------------------------- html -- */

const HTML_STYLES = `
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 3rem 1.5rem 6rem;
    background: #faf6ee; color: #221d19;
    font-family: "Iowan Old Style", Palatino, Georgia, serif;
    line-height: 1.75;
  }
  .wrap { max-width: 42rem; margin: 0 auto; }
  h1 { font-size: 2.4rem; line-height: 1.15; letter-spacing: -0.02em; margin: 0 0 .5rem; }
  h2.chapter {
    font-size: 1.6rem; margin: 3.5rem 0 .35rem; padding-top: 1.5rem;
    border-top: 1px solid #d6c6a8;
  }
  h3.entry { font-size: 1.2rem; margin: 2.2rem 0 .3rem; }
  .lede { color: #6b5f54; font-style: italic; margin: 0 0 2.5rem; }
  .meta { color: #6b5f54; font-size: .85rem; font-style: italic; margin: 0 0 1.1rem; }
  .sub { color: #6b5f54; font-size: .95rem; font-style: italic; margin: 0 0 1.5rem; }
  p { margin: 0 0 1.15em; }
  blockquote { margin: 1.4em 0; padding-left: 1rem; border-left: 3px solid #c8a961; font-style: italic; color: #4a4038; }
  img { max-width: 100%; border-radius: .5rem; margin: 1.5em 0; }
  hr { border: 0; border-top: 1px solid #e8ddca; margin: 3rem 0; }
  ul.tags, ul.people { list-style: none; padding: 0; margin: 0 0 1.5rem; font-size: .85rem; color: #6b5f54; }
  ul.tags li, ul.people li { display: inline-block; margin-right: .5rem; }
  .footer { margin-top: 4rem; padding-top: 1.5rem; border-top: 1px solid #e8ddca; font-size: .8rem; color: #8d8175; }
  @media print { body { background: #fff; padding: 0; } h2.chapter { break-before: page; border-top: 0; } }
  @media (prefers-color-scheme: dark) {
    body { background: #14110f; color: #e8e2d8; }
    .lede, .meta, .sub, ul.tags, ul.people { color: #a49a8d; }
    h2.chapter { border-color: #352d26; }
    blockquote { color: #c9c2b6; }
    hr, .footer { border-color: #352d26; }
  }
`;

export function renderHtmlBook(book: Book): string {
  const parts: string[] = [];

  parts.push(`<!doctype html><html lang="en"><head><meta charset="utf-8">`);
  parts.push(`<meta name="viewport" content="width=device-width, initial-scale=1">`);
  parts.push(`<title>${escapeHtml(book.title)}</title>`);
  parts.push(`<style>${HTML_STYLES}</style></head><body><div class="wrap">`);

  parts.push(`<h1>${escapeHtml(book.title)}</h1>`);
  if (book.subtitle) parts.push(`<p class="lede">${escapeHtml(book.subtitle)}</p>`);
  parts.push(
    `<p class="sub">${escapeHtml(book.author)} · ${book.totals.entries} entries · ${book.totals.words.toLocaleString()} words · exported ${book.generatedAt.toISOString().slice(0, 10)}</p>`,
  );
  parts.push(`<hr>`);

  for (const chapter of book.chapters) {
    parts.push(`<h2 class="chapter">${escapeHtml(chapter.emoji)} ${escapeHtml(chapter.title)}</h2>`);
    if (chapter.description) parts.push(`<p class="sub">${escapeHtml(chapter.description)}</p>`);

    for (const entry of chapter.entries) {
      parts.push(`<h3 class="entry">${escapeHtml(entry.title)}</h3>`);
      const meta = [
        entry.occurredAt,
        entry.location,
        entry.mood,
        entry.status === "draft" ? "draft" : null,
      ].filter(Boolean);
      if (meta.length > 0) parts.push(`<p class="meta">${escapeHtml(meta.join(" · "))}</p>`);
      parts.push(entry.html);
      if (entry.tags.length > 0) {
        parts.push(
          `<ul class="tags">${entry.tags.map((tag) => `<li>#${escapeHtml(tag)}</li>`).join("")}</ul>`,
        );
      }
      if (entry.people.length > 0) {
        parts.push(
          `<ul class="people">${entry.people.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ul>`,
        );
      }
    }
  }

  if (book.milestones.length > 0) {
    parts.push(`<h2 class="chapter">Timeline</h2><ul>`);
    for (const milestone of book.milestones) {
      parts.push(
        `<li><strong>${escapeHtml(milestone.occurredOn)}</strong> — ${escapeHtml(milestone.title)}${milestone.description ? ` — ${escapeHtml(milestone.description)}` : ""}</li>`,
      );
    }
    parts.push(`</ul>`);
  }

  if (book.people.length > 0) {
    parts.push(`<h2 class="chapter">People</h2><ul>`);
    for (const person of book.people) {
      parts.push(
        `<li><strong>${escapeHtml(person.name)}</strong>${person.relationship ? ` (${escapeHtml(person.relationship)})` : ""}${person.notes ? ` — ${escapeHtml(person.notes)}` : ""}</li>`,
      );
    }
    parts.push(`</ul>`);
  }

  parts.push(`<div class="footer">Exported from Everstory — My Untold Legacy.</div>`);
  parts.push(`</div></body></html>`);

  return parts.join("\n");
}

/* ------------------------------------------------------------------- json -- */

/**
 * The archival format: everything, with enough structure that it can be
 * imported into another tool in fifty years.
 */
export function renderJsonBook(book: Book): string {
  return JSON.stringify(
    {
      format: "everstory-export",
      version: 1,
      exportedAt: book.generatedAt.toISOString(),
      title: book.title,
      author: book.author,
      subtitle: book.subtitle,
      totals: book.totals,
      chapters: book.chapters.map((chapter) => ({
        title: chapter.title,
        emoji: chapter.emoji,
        description: chapter.description,
        wordCount: chapter.wordCount,
        entries: chapter.entries.map((entry) => ({
          id: entry.id,
          title: entry.title,
          body: entry.body,
          excerpt: entry.excerpt,
          occurredAt: entry.occurredAt,
          location: entry.location,
          mood: entry.mood,
          wordCount: entry.wordCount,
          status: entry.status,
          visibility: entry.visibility,
          tags: entry.tags,
          people: entry.people,
          photos: entry.photos.map((photo) => ({
            id: photo.id,
            filename: photo.filename,
            altText: photo.altText,
            mimeType: photo.mimeType,
            url: `/api/media/${photo.id}`,
          })),
        })),
      })),
      milestones: book.milestones,
      people: book.people,
    },
    null,
    2,
  );
}
