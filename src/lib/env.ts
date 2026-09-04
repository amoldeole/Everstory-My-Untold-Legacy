import { z } from "zod";

/**
 * Environment configuration.
 *
 * Two deliberate choices:
 *
 * 1. Everything has a working default. `git clone && npm run dev` must work
 *    on a MacBook or a Windows machine with nothing configured.
 * 2. Validation is lazy and explicit. A typo in `DATABASE_URL` should produce
 *    one clear error at the point of use, not a stack trace at build time.
 */

const booleanish = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0", "yes", "no", ""])])
  .transform((value) => (typeof value === "boolean" ? value : ["true", "1", "yes"].includes(value)))
  .default(false);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // ---------------------------------------------------------------- database
  DATABASE_URL: z.string().trim().min(1).optional(),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().max(100).default(10),
  EVERSTORY_DATA_DIR: z.string().trim().min(1).default(".data"),

  // -------------------------------------------------------------------- app
  NEXT_PUBLIC_APP_URL: z.string().trim().min(1).default("http://localhost:3000"),
  APP_URL: z.string().trim().min(1).default("http://localhost:3000"),

  // ------------------------------------------------------------------- auth
  /** `single` auto-signs you in as the local owner — handy for trying it out. */
  AUTH_MODE: z.enum(["credentials", "single"]).default("credentials"),
  SESSION_SECRET: z.string().trim().min(1).optional(),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().max(365).default(30),
  ALLOW_SIGNUP: booleanish,

  GOOGLE_CLIENT_ID: z.string().trim().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().trim().min(1).optional(),
  GITHUB_CLIENT_ID: z.string().trim().min(1).optional(),
  GITHUB_CLIENT_SECRET: z.string().trim().min(1).optional(),

  // ---------------------------------------------------------------- storage
  STORAGE_DRIVER: z.enum(["disk", "s3"]).default("disk"),
  S3_ENDPOINT: z.string().trim().min(1).optional(),
  S3_REGION: z.string().trim().min(1).default("auto"),
  S3_BUCKET: z.string().trim().min(1).optional(),
  S3_ACCESS_KEY_ID: z.string().trim().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().trim().min(1).optional(),
  S3_FORCE_PATH_STYLE: booleanish,
  S3_PUBLIC_URL: z.string().trim().min(1).optional(),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().max(500).default(10),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

function normalise(raw: NodeJS.ProcessEnv): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = { ...raw };
  // `ALLOW_SIGNUP` defaults to false only in production; during development we
  // want the signup form to work out of the box.
  if (out.ALLOW_SIGNUP === undefined) {
    out.ALLOW_SIGNUP = out.NODE_ENV === "production" ? "false" : "true";
  }
  if (out.APP_URL === undefined && out.NEXT_PUBLIC_APP_URL !== undefined) {
    out.APP_URL = out.NEXT_PUBLIC_APP_URL;
  }
  return out;
}

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(normalise(process.env));
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  cached = parsed.data;
  return cached;
}

/** Test/CLI helper: forget the cached environment so the next read re-parses. */
export function resetEnvCache(): void {
  cached = null;
}

export function isProduction(): boolean {
  return getEnv().NODE_ENV === "production";
}

export function getAppUrl(): string {
  const env = getEnv();
  const url = env.APP_URL || env.NEXT_PUBLIC_APP_URL;
  return url.replace(/\/+$/, "");
}
