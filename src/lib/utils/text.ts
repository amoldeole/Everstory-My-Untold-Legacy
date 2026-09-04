/** Strips Markdown syntax so we can build a readable plain-text excerpt. */
export function toPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s{0,3}([-*+]|\d+\.)\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/^\s{0,3}([-*_]\s*){3,}$/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function countWords(markdown: string): number {
  const plain = toPlainText(markdown);
  if (!plain) return 0;
  return plain.split(/\s+/).filter(Boolean).length;
}

export function makeExcerpt(markdown: string, maxLength = 180): string {
  const plain = toPlainText(markdown);
  if (plain.length <= maxLength) return plain;
  const cut = plain.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** 200 wpm is the conventional reading speed for prose. */
export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 200));
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Turns a title like "My First Bike" into a URL/filename-safe stem. */
export function toFileStem(input: string): string {
  const slug = slugify(input);
  return slug.length > 0 ? slug : "untitled";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function generateShareToken(): string {
  // 16 random bytes -> 22 chars of URL-safe entropy. Unguessable, short enough
  // to paste into a message.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}
