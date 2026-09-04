import { describe, expect, it } from "vitest";

import {
  countWords,
  formatBytes,
  makeExcerpt,
  readingMinutes,
  slugify,
  toFileStem,
  toPlainText,
} from "@/lib/utils/text";

describe("toPlainText", () => {
  it("strips Markdown syntax but keeps the words", () => {
    expect(toPlainText("# A heading\n\nSome **bold** and _italic_ text.")).toBe(
      "A heading Some bold and italic text.",
    );
  });

  it("keeps the visible text of links and drops the URL", () => {
    expect(toPlainText("See [my site](https://example.com) for more.")).toBe("See my site for more.");
  });

  it("removes fenced code blocks", () => {
    const markdown = "Before\n\n```js\nconst secret = 1;\n```\n\nAfter";
    expect(toPlainText(markdown)).toBe("Before After");
  });

  it("collapses whitespace", () => {
    expect(toPlainText("a\n\n\n   b\t\t c ")).toBe("a b c");
  });
});

describe("countWords", () => {
  it("counts words in prose", () => {
    expect(countWords("one two three four")).toBe(4);
  });

  it("returns zero for empty and whitespace-only input", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   \n\t ")).toBe(0);
  });

  it("does not count Markdown syntax as words", () => {
    expect(countWords("# Title\n\n- one\n- two")).toBe(3);
  });
});

describe("makeExcerpt", () => {
  it("returns short text unchanged", () => {
    expect(makeExcerpt("A short line.", 180)).toBe("A short line.");
  });

  it("truncates on a word boundary and adds an ellipsis", () => {
    const excerpt = makeExcerpt("The quick brown fox jumps over the lazy dog", 20);
    expect(excerpt.length).toBeLessThanOrEqual(21);
    expect(excerpt.endsWith("…")).toBe(true);
    expect(excerpt).not.toMatch(/\s$/);
  });
});

describe("slugify", () => {
  it("produces URL-safe slugs", () => {
    expect(slugify("My First Bike")).toBe("my-first-bike");
    expect(slugify("Café / Crème!")).toBe("cafe-creme");
  });

  it("handles strings that have no usable characters", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("toFileStem", () => {
  it("falls back to a safe name for unusable titles", () => {
    expect(toFileStem("!!!")).toBe("untitled");
    expect(toFileStem("  ")).toBe("untitled");
  });
});

describe("readingMinutes", () => {
  it("never reports less than a minute", () => {
    expect(readingMinutes(0)).toBe(1);
    expect(readingMinutes(10)).toBe(1);
  });

  it("rounds sensibly", () => {
    expect(readingMinutes(400)).toBe(2);
  });
});

describe("formatBytes", () => {
  it("formats across units", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
