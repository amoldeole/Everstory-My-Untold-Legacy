import fs from "node:fs/promises";
import path from "node:path";

import { resolveDatabaseConfig } from "@/db/config";

import { assertSafeKey, type PutOptions, type StorageDriver, type StoredObject } from "./types";

const CONTENT_TYPE_FALLBACK = "application/octet-stream";

function guessType(key: string, provided: string): string {
  return provided && provided.length > 0 ? provided : CONTENT_TYPE_FALLBACK;
}

/**
 * Stores uploads on the local filesystem.
 *
 * This is the default. It means a fresh clone works with no cloud account, and
 * it is the right choice for a single-node deployment as long as the data
 * directory is on a persistent volume (see `docker-compose.yml`).
 */
export function createDiskDriver(): StorageDriver {
  const root = path.join(resolveDatabaseConfig().dataDir, "uploads");

  const resolve = (key: string): string => {
    assertSafeKey(key);
    const full = path.resolve(root, key);
    const withSep = root.endsWith(path.sep) ? root : root + path.sep;
    if (!full.startsWith(withSep) && full !== root) {
      throw new Error("Storage key escapes the uploads directory");
    }
    return full;
  };

  return {
    name: "disk",
    async put(key: string, body: Buffer, options: PutOptions): Promise<void> {
      const full = resolve(key);
      await fs.mkdir(path.dirname(full), { recursive: true });
      await fs.writeFile(full, body);
      // Remember the content type so we can serve it back without sniffing.
      await fs.writeFile(`${full}.meta.json`, JSON.stringify({ contentType: options.contentType }), "utf8");
    },

    async get(key: string): Promise<StoredObject | null> {
      const full = resolve(key);
      try {
        const [body, meta] = await Promise.all([
          fs.readFile(full),
          fs.readFile(`${full}.meta.json`, "utf8").catch(() => null),
        ]);
        let contentType = guessType(key, "");
        if (meta) {
          try {
            contentType = (JSON.parse(meta) as { contentType?: string }).contentType ?? contentType;
          } catch {
            /* fall through to the default */
          }
        }
        return { body, contentType, size: body.byteLength };
      } catch {
        return null;
      }
    },

    async delete(key: string): Promise<void> {
      const full = resolve(key);
      await Promise.all([fs.rm(full, { force: true }), fs.rm(`${full}.meta.json`, { force: true })]);
    },

    publicUrl(): string | null {
      // Files are outside `public/` by design, so they are served through an
      // authenticated route handler instead.
      return null;
    },
  };
}
