import { randomBytes } from "node:crypto";
import path from "node:path";

import { getEnv } from "@/lib/env";

import { createDiskDriver } from "./disk";
import { createS3Driver } from "./s3";
import type { StorageDriver } from "./types";

export type { StorageDriver, StoredObject, PutOptions } from "./types";

const globalForStorage = globalThis as unknown as { __everstoryStorage?: StorageDriver };

export function getStorage(): StorageDriver {
  if (globalForStorage.__everstoryStorage) return globalForStorage.__everstoryStorage;
  const driver = getEnv().STORAGE_DRIVER === "s3" ? createS3Driver() : createDiskDriver();
  globalForStorage.__everstoryStorage = driver;
  return driver;
}

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "image/svg+xml": ".svg",
  "application/pdf": ".pdf",
  "audio/mpeg": ".mp3",
  "audio/mp4": ".m4a",
  "audio/wav": ".wav",
  "video/mp4": ".mp4",
  "text/plain": ".txt",
};

/** Extension allowlist — we never trust the extension the browser sent us. */
export const ALLOWED_UPLOAD_TYPES = new Set(Object.keys(EXTENSION_BY_TYPE));

export function isAllowedUploadType(mimeType: string): boolean {
  return ALLOWED_UPLOAD_TYPES.has(mimeType);
}

/**
 * Builds a storage key from the user id and a random slug.
 *
 * Keeping the user id in the path makes per-user cleanup trivial and means a
 * leaked key can never address another writer's files.
 */
export function buildStorageKey(userId: string, mimeType: string): string {
  const extension = EXTENSION_BY_TYPE[mimeType] ?? path.extname(mimeType) ?? ".bin";
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `u/${userId}/${yyyy}/${mm}/${randomBytes(16).toString("hex")}${extension}`;
}

export function maxUploadBytes(): number {
  return getEnv().MAX_UPLOAD_MB * 1024 * 1024;
}
