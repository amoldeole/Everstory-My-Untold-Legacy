import { describe, expect, it } from "vitest";

import { renderHtmlBook, renderJsonBook, renderMarkdownBook } from "@/lib/export/renderers";
import type { Book } from "@/lib/export/book";

function makeBook(): Book {
  return {
    title: "Ada's Everstory",
    author: "Ada Lovelace",
    subtitle: "Notes on a life",
    generatedAt: new Date("2026-01-02T03:04:05.000Z"),
    chapters: [
      {
        id: "chapter-1",
        title: "Childhood",
        emoji: "🧸",
        description: "The early years",
        position: 0,
        wordCount: 4,
        entries: [
          {
            id: "entry-1",
            title: "The blue door",
            body: "The house had a **blue** door.",
            html: "<p>The house had a <strong>blue</strong> door.</p>",
            excerpt: "The house had a blue door.",
            occurredAt: "1986-04-12",
            location: "Pimpri-Chinchwad",
            mood: "nostalgic",
            wordCount: 6,
            status: "published",
            visibility: "shared",
            tags: ["home"],
            people: ["Aai"],
            photos: [
              {
                id: "photo-1",
                filename: "door.jpg",
                altText: "A blue door",
                mimeType: "image/jpeg",
                storageKey: "u/1/door.jpg",
              },
            ],
          },
        ],
      },
    ],
    milestones: [{ title: "Born", occurredOn: "1986-04-12", description: null, category: "life" }],
    people: [{ name: "Aai", relationship: "Mother", notes: "Kept the radio on." }],
    totals: { entries: 1, words: 6, photos: 1, chapters: 1 },
  };
}

describe("renderMarkdownBook", () => {
  it("includes the title, author and chapter structure", () => {
    const md = renderMarkdownBook(makeBook());
    expect(md).toContain("# Ada's Everstory");
    expect(md).toContain("Ada Lovelace");
    expect(md).toContain("# 🧸 Childhood");
    expect(md).toContain("## The blue door");
  });

  it("keeps the original Markdown body verbatim", () => {
    expect(renderMarkdownBook(makeBook())).toContain("The house had a **blue** door.");
  });

  it("emits image references the app can serve", () => {
    expect(renderMarkdownBook(makeBook())).toContain("![A blue door](/api/media/photo-1)");
  });

  it("includes the timeline and people appendices", () => {
    const md = renderMarkdownBook(makeBook());
    expect(md).toContain("# Timeline");
    expect(md).toContain("**1986-04-12**");
    expect(md).toContain("# People");
    expect(md).toContain("**Aai** (Mother)");
  });
});

describe("renderHtmlBook", () => {
  it("produces a complete, standalone document", () => {
    const html = renderHtmlBook(makeBook());
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("</html>");
    expect(html).toContain("<title>Ada&#39;s Everstory</title>");
  });

  it("escapes user content in the title", () => {
    const book = makeBook();
    book.title = "<script>alert(1)</script>";
    const html = renderHtmlBook(book);
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("embeds the rendered entry HTML", () => {
    expect(renderHtmlBook(makeBook())).toContain("<strong>blue</strong>");
  });

  it("includes a print stylesheet so the browser can produce a PDF", () => {
    expect(renderHtmlBook(makeBook())).toContain("@media print");
  });
});

describe("renderJsonBook", () => {
  it("matches the documented envelope", () => {
    const parsed = JSON.parse(renderJsonBook(makeBook())) as Record<string, unknown>;
    expect(parsed.format).toBe("everstory-export");
    expect(parsed.version).toBe(1);
    expect(parsed.title).toBe("Ada's Everstory");
    expect(parsed.exportedAt).toBe("2026-01-02T03:04:05.000Z");
  });

  it("preserves entry bodies and metadata", () => {
    const parsed = JSON.parse(renderJsonBook(makeBook())) as {
      chapters: Array<{ entries: Array<{ body: string; tags: string[]; people: string[] }> }>;
    };
    const entry = parsed.chapters[0]!.entries[0]!;
    expect(entry.body).toBe("The house had a **blue** door.");
    expect(entry.tags).toEqual(["home"]);
    expect(entry.people).toEqual(["Aai"]);
  });

  it("is valid JSON with no trailing content", () => {
    expect(() => JSON.parse(renderJsonBook(makeBook()))).not.toThrow();
  });
});
