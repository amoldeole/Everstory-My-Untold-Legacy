import { describe, expect, it } from "vitest";

import {
  assertPasswordPolicy,
  hashPassword,
  isPasswordPolicyError,
  passwordStrength,
  verifyPassword,
} from "@/lib/auth/password";

const PASSWORD = "correct horse battery staple";

describe("hashPassword / verifyPassword", () => {
  it("round-trips a password", async () => {
    const hash = await hashPassword(PASSWORD);
    expect(hash).not.toContain(PASSWORD);
    expect(await verifyPassword(PASSWORD, hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword(PASSWORD);
    expect(await verifyPassword("wrong password entirely", hash)).toBe(false);
  });

  it("produces a different hash each time (salted)", async () => {
    const a = await hashPassword(PASSWORD);
    const b = await hashPassword(PASSWORD);
    expect(a).not.toBe(b);
    expect(await verifyPassword(PASSWORD, a)).toBe(true);
    expect(await verifyPassword(PASSWORD, b)).toBe(true);
  });

  it("returns false for a malformed or missing stored hash", async () => {
    expect(await verifyPassword(PASSWORD, null)).toBe(false);
    expect(await verifyPassword(PASSWORD, "")).toBe(false);
    expect(await verifyPassword(PASSWORD, "not-a-hash")).toBe(false);
    expect(await verifyPassword(PASSWORD, "scrypt$nonsense$values")).toBe(false);
  });

  it("records the scrypt parameters in the stored string", async () => {
    const hash = await hashPassword(PASSWORD);
    expect(hash.startsWith("scrypt$16384$8$1$")).toBe(true);
  });
});

describe("assertPasswordPolicy", () => {
  it("rejects short passwords", () => {
    expect(() => assertPasswordPolicy("short")).toThrow(/at least 10/i);
  });

  it("rejects absurdly long passwords", () => {
    expect(() => assertPasswordPolicy("a".repeat(201))).toThrow(/too long/i);
  });

  it("accepts a long passphrase", () => {
    expect(() => assertPasswordPolicy("a long passphrase with spaces")).not.toThrow();
  });
});

describe("isPasswordPolicyError", () => {
  it("identifies policy errors only", () => {
    try {
      assertPasswordPolicy("x");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(isPasswordPolicyError(error)).toBe(true);
    }
    expect(isPasswordPolicyError(new Error("boom"))).toBe(false);
  });
});

describe("passwordStrength", () => {
  it("scores from empty to strong", () => {
    expect(passwordStrength("")).toBe(0);
    expect(passwordStrength("abc")).toBe(0);
    expect(passwordStrength("abcdefghij")).toBeGreaterThan(0);
    expect(passwordStrength("Abcdefghij1!klmnop")).toBeGreaterThanOrEqual(3);
  });
});
