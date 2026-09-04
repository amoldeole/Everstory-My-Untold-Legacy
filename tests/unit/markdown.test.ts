import { describe, expect, it } from "vitest";

import { escapeHtml, renderMarkdown, safeRenderMarkdown } from "@/lib/markdown";

describe("renderMarkdown", () => {
  it("renders headings, emphasis and lists", () => {
    const html = renderMarkdown("# Title\n\nSome **bold** and *italic*.\n\n- one\n- two");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<li>one</li>");
  });

  it("renders blockquotes and rules", () => {
    const html = renderMarkdown("> quoted\n\n---");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("<hr");
  });

  // -------------------------------------------------------------------------
  // Security: everything below is about not trusting what a writer pastes,
  // because rendered output is also served on public share pages.
  // -------------------------------------------------------------------------

  it("strips script tags", () => {
    const html = renderMarkdown("hello <script>alert('xss')</script>");
    expect(html).not.toContain("<script");
    expect(html).toContain("hello");
  });

  it("neutralises inline event handlers", () => {
    const html = renderMarkdown('<img src="x" onerror="alert(1)">');
    expect(html).not.toContain("onerror");
  });

  it("marks external links as noopener", () => {
    const html = renderMarkdown("[site](https://example.com)");
    expect(html).toContain('rel="noopener noreferrer nofollow"');
    expect(html).toContain('target="_blank"');
  });

  it("blocks javascript: URLs", () => {
    const html = renderMarkdown("[click](javascript:alert(1))");
    expect(html.toLowerCase()).not.toContain("javascript:");
  });

  it("allows images but keeps their alt text", () => {
    const html = renderMarkdown("![a cat](/api/media/123)");
    expect(html).toContain("<img");
    expect(html).toContain('alt="a cat"');
  });
});

describe("safeRenderMarkdown", () => {
  it("returns an empty string for null or undefined", () => {
    expect(safeRenderMarkdown(null)).toBe("");
    expect(safeRenderMarkdown(undefined)).toBe("");
  });

  it("renders normal content", () => {
    expect(safeRenderMarkdown("**hello**")).toContain("<strong>hello</strong>");
  });
});

describe("escapeHtml", () => {
  it("escapes every significant character", () => {
    expect(escapeHtml('<a href="x">&\'</a>')).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;");
  });
});
