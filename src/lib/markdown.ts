import { Marked } from "marked";
import sanitizeHtml from "sanitize-html";

/**
 * Markdown for the memoir editor.
 *
 * Deliberately small: headings, emphasis, lists, links, quotes, code, images
 * and horizontal rules. No raw HTML — writers paste in text, not markup, and
 * allowing HTML would turn every share link into an XSS vector.
 */
const renderer = new Marked({
  gfm: true,
  breaks: true,
});

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "em",
    "del",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "blockquote",
    "a",
    "img",
    "hr",
    "code",
    "pre",
    "figure",
    "figcaption",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
  },
  allowedSchemes: ["http", "https", "mailto", "data"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  transformTags: {
    a: (tagName, attribs) => {
      const href = attribs.href ?? "";
      const isExternal = /^https?:\/\//i.test(href);
      return {
        tagName,
        attribs: {
          ...attribs,
          ...(isExternal ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {}),
        },
      };
    },
  },
};

export function renderMarkdown(markdown: string): string {
  const raw = renderer.parse(markdown ?? "", { async: false }) as string;
  return sanitizeHtml(raw, SANITIZE_OPTIONS);
}

/** Same as `renderMarkdown`, tolerant of bad input (used on public pages). */
export function safeRenderMarkdown(markdown: string | null | undefined): string {
  if (!markdown) return "";
  try {
    return renderMarkdown(markdown);
  } catch {
    return "";
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
