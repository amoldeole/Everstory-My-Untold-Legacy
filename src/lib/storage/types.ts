export interface PutOptions {
  contentType: string;
  /** Original filename, kept for Content-Disposition on download. */
  filename?: string;
}

export interface StoredObject {
  body: Buffer;
  contentType: string;
  size: number;
}

export interface StorageDriver {
  readonly name: "disk" | "s3";
  put(key: string, body: Buffer, options: PutOptions): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
  /**
   * A URL the browser can use directly, or null when reads must be proxied
   * through `/api/media/[id]` (the disk driver, and S3 buckets that are not
   * public).
   */
  publicUrl(key: string): string | null;
}

/**
 * Storage keys are always built by us from a user id, never from user input,
 * so they cannot escape the prefix. This is a belt-and-braces check.
 */
export function assertSafeKey(key: string): void {
  if (!key || key.length > 512) throw new Error("Invalid storage key");
  if (key.includes("..") || key.startsWith("/") || /[\\:*?"<>|]/.test(key)) {
    throw new Error("Invalid storage key");
  }
  if (!/^[A-Za-z0-9._/-]+$/.test(key)) throw new Error("Invalid storage key");
}
