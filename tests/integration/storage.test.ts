import { afterAll, describe, expect, it } from "vitest";

import { createDiskDriver } from "@/lib/storage/disk";
import { assertSafeKey, type StorageDriver } from "@/lib/storage/types";
import { buildStorageKey, isAllowedUploadType } from "@/lib/storage";

/**
 * Storage driver tests.
 *
 * The disk driver is the default, so it is the one that must be right: it is
 * where uploads go for everyone who has not configured S3.
 */
const driver: StorageDriver = createDiskDriver();

afterAll(async () => {
  // Best-effort cleanup of anything a test wrote.
  await driver.delete("u/test-user/2026/01/hello.txt").catch(() => undefined);
});

describe("assertSafeKey", () => {
  it("accepts normal keys", () => {
    expect(() => assertSafeKey("u/abc-123/2026/01/photo.jpg")).not.toThrow();
  });

  it("rejects traversal attempts", () => {
    expect(() => assertSafeKey("../../etc/passwd")).toThrow();
    expect(() => assertSafeKey("u/../../secret")).toThrow();
  });

  it("rejects absolute paths and Windows-invalid characters", () => {
    expect(() => assertSafeKey("/etc/passwd")).toThrow();
    expect(() => assertSafeKey("u\\windows")).toThrow();
    expect(() => assertSafeKey("u/file:name")).toThrow();
  });
});

describe("disk driver", () => {
  it("round-trips a file", async () => {
    const key = "u/test-user/2026/01/hello.txt";
    const body = Buffer.from("hello everstory", "utf8");

    await driver.put(key, body, { contentType: "text/plain", filename: "hello.txt" });
    const stored = await driver.get(key);

    expect(stored).not.toBeNull();
    expect(stored?.body.toString("utf8")).toBe("hello everstory");
    expect(stored?.contentType).toBe("text/plain");
    expect(stored?.size).toBe(body.byteLength);
  });

  it("returns null for a missing key instead of throwing", async () => {
    expect(await driver.get("u/test-user/does-not-exist.bin")).toBeNull();
  });

  it("deletes a stored file", async () => {
    const key = "u/test-user/2026/01/gone.txt";
    await driver.put(key, Buffer.from("bye"), { contentType: "text/plain" });
    expect(await driver.get(key)).not.toBeNull();

    await driver.delete(key);
    expect(await driver.get(key)).toBeNull();
  });

  it("never exposes a public URL — reads are proxied and authorised", () => {
    expect(driver.publicUrl("anything")).toBeNull();
  });

  it("refuses keys that escape the upload root", async () => {
    await expect(
      driver.put("../../escape.txt", Buffer.from("x"), { contentType: "text/plain" }),
    ).rejects.toThrow();
  });
});

describe("buildStorageKey", () => {
  it("scopes keys under the user id", () => {
    const key = buildStorageKey("user-123", "image/png");
    expect(key.startsWith("u/user-123/")).toBe(true);
    expect(key.endsWith(".png")).toBe(true);
  });

  it("generates a unique key each time", () => {
    const a = buildStorageKey("user-123", "image/jpeg");
    const b = buildStorageKey("user-123", "image/jpeg");
    expect(a).not.toBe(b);
  });
});

describe("isAllowedUploadType", () => {
  it("allows common image types", () => {
    expect(isAllowedUploadType("image/jpeg")).toBe(true);
    expect(isAllowedUploadType("image/png")).toBe(true);
    expect(isAllowedUploadType("image/webp")).toBe(true);
  });

  it("rejects executable and unknown types", () => {
    expect(isAllowedUploadType("application/x-msdownload")).toBe(false);
    expect(isAllowedUploadType("text/html")).toBe(false);
    expect(isAllowedUploadType("")).toBe(false);
  });
});
