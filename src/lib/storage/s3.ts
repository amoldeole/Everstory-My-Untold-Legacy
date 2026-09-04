import { createHash, createHmac } from "node:crypto";

import { getEnv } from "@/lib/env";

import { assertSafeKey, type PutOptions, type StorageDriver, type StoredObject } from "./types";

function sha256Hex(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function rfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/** Encodes each path segment but keeps the separators intact. */
function encodePath(pathname: string): string {
  return pathname
    .split("/")
    .map((segment) => rfc3986(segment))
    .join("/");
}

function amzDate(date: Date): { long: string; short: string } {
  const long = `${date.toISOString().replace(/[:-]|\.\d{3}/g, "")}`;
  return { long, short: long.slice(0, 8) };
}

/**
 * A minimal S3 client implementing AWS Signature Version 4 by hand.
 *
 * Adding the official SDK would pull in dozens of packages for three
 * operations. This talks to anything S3-compatible — AWS S3, Cloudflare R2,
 * MinIO, Backblaze B2, Hetzner, Supabase Storage — which is the whole point:
 * you pick the host, not us.
 */
export function createS3Driver(): StorageDriver {
  const env = getEnv();

  const endpoint = (env.S3_ENDPOINT ?? "https://s3.amazonaws.com").replace(/\/+$/, "");
  const bucket = env.S3_BUCKET;
  const region = env.S3_REGION || "auto";
  const accessKeyId = env.S3_ACCESS_KEY_ID;
  const secretAccessKey = env.S3_SECRET_ACCESS_KEY;
  const forcePathStyle = env.S3_FORCE_PATH_STYLE;

  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "STORAGE_DRIVER=s3 requires S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY (and usually S3_ENDPOINT).",
    );
  }

  const url = new URL(endpoint);
  const host = url.host;

  function objectUrl(key: string): { url: string; canonicalPath: string } {
    assertSafeKey(key);
    const pathname = forcePathStyle ? `/${bucket}/${key}` : `/${key}`;
    const canonicalPath = encodePath(pathname.startsWith("/") ? pathname : `/${pathname}`);
    const target = forcePathStyle
      ? `${endpoint}${canonicalPath}`
      : `${url.protocol}//${bucket}.${host}${canonicalPath}`;
    return { url: target, canonicalPath };
  }

  async function request(
    method: "GET" | "PUT" | "DELETE",
    key: string,
    options: { body?: Buffer; contentType?: string } = {},
  ): Promise<Response> {
    const { url: target, canonicalPath } = objectUrl(key);
    const payloadHash = sha256Hex(options.body ?? "");
    const now = new Date();
    const { long, short } = amzDate(now);

    const headers: Record<string, string> = {
      host: forcePathStyle ? host : `${bucket}.${host}`,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": long,
    };
    if (options.contentType) headers["content-type"] = options.contentType;
    if (options.body) headers["content-length"] = String(options.body.byteLength);

    const sortedNames = Object.keys(headers)
      .map((name) => name.toLowerCase())
      .sort();

    const canonicalHeaders = sortedNames.map((name) => `${name}:${String(headers[name]).trim()}\n`).join("");
    const signedHeaders = sortedNames.join(";");

    const canonicalRequest = [
      method,
      canonicalPath,
      "", // no query string
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const scope = `${short}/${region}/s3/aws4_request`;
    const stringToSign = ["AWS4-HMAC-SHA256", long, scope, sha256Hex(canonicalRequest)].join("\n");

    const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, short), region), "s3"), "aws4_request");
    const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

    headers.authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return fetch(target, {
      method,
      headers,
      body: options.body ? new Uint8Array(options.body) : undefined,
      cache: "no-store",
    });
  }

  return {
    name: "s3",
    async put(key: string, body: Buffer, options: PutOptions): Promise<void> {
      const response = await request("PUT", key, { body, contentType: options.contentType });
      if (!response.ok) {
        throw new Error(`S3 upload failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
      }
    },
    async get(key: string): Promise<StoredObject | null> {
      const response = await request("GET", key);
      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`S3 download failed (${response.status})`);
      }
      const body = Buffer.from(await response.arrayBuffer());
      return {
        body,
        contentType: response.headers.get("content-type") ?? "application/octet-stream",
        size: body.byteLength,
      };
    },
    async delete(key: string): Promise<void> {
      const response = await request("DELETE", key);
      if (!response.ok && response.status !== 404) {
        throw new Error(`S3 delete failed (${response.status})`);
      }
    },
    publicUrl(key: string): string | null {
      const base = env.S3_PUBLIC_URL?.replace(/\/+$/, "");
      if (!base) return null;
      return `${base}/${key.split("/").map(rfc3986).join("/")}`;
    },
  };
}
