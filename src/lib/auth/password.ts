import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * Password hashing using scrypt from Node's standard library.
 *
 * scrypt is memory-hard, which is what you want against GPU cracking, and —
 * crucially here — it ships with Node. There is no native module to compile,
 * so `npm install` behaves identically on macOS, Windows and Linux. (Argon2
 * would be marginally better, but every Argon2 package needs a toolchain, and
 * the first thing that breaks on a fresh Windows laptop is a native build.)
 */
const PARAMS = { N: 16384, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
const MAX_MEM = 64 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH, {
    ...PARAMS,
    maxmem: MAX_MEM,
  });
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, n, r, p, saltB64, hashB64] = parts as [string, string, string, string, string, string];
  const N = Number.parseInt(n, 10);
  const cost = { N, r: Number.parseInt(r, 10), p: Number.parseInt(p, 10) };
  if (!Number.isFinite(cost.N) || !Number.isFinite(cost.r) || !Number.isFinite(cost.p)) return false;

  try {
    const salt = Buffer.from(saltB64, "base64url");
    const expected = Buffer.from(hashB64, "base64url");
    const actual = await scryptAsync(password.normalize("NFKC"), salt, expected.length, {
      ...cost,
      maxmem: MAX_MEM,
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Throws a readable error when a password does not meet the policy. */
export function assertPasswordPolicy(password: string): void {
  if (typeof password !== "string" || password.length < 10) {
    throw new PasswordPolicyError("Use at least 10 characters.");
  }
  if (password.length > 200) {
    throw new PasswordPolicyError("That password is too long.");
  }
  if (/\s{2,}/.test(password)) {
    throw new PasswordPolicyError("Repeated whitespace is not allowed.");
  }
}

export class PasswordPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasswordPolicyError";
  }
}

export function isPasswordPolicyError(error: unknown): error is PasswordPolicyError {
  return error instanceof PasswordPolicyError;
}

/** Basic strength estimate for the signup meter. Returns 0–4. */
export function passwordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 10) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^\w\s]/.test(password)) score++;
  if (password.length >= 24) score++;
  return Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
}
