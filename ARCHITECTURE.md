# Architecture

The decisions in here are all in service of one requirement: **the same codebase must run unchanged on a MacBook, a Windows laptop, a CI runner, a Docker host and a serverless platform.**

---

## The one decision everything else follows from

Most web apps make you install a database before you can run them. That is fine for a team and terrible for a person who just wants to try something.

Everstory uses **PGlite** — real PostgreSQL 18 compiled to WebAssembly — as the default database. It runs inside the Node process and writes to `.data/pgdata`. Set `DATABASE_URL` and the exact same code, the exact same schema and the exact same SQL talk to a real Postgres server instead.

```
                    ┌──────────────────────────┐
                    │      src/db/index.ts     │
                    │   resolveDatabaseConfig  │
                    └────────────┬─────────────┘
                                 │
              DATABASE_URL set?  │
              ┌──────────────────┴──────────────────┐
              │ no                                 yes│
              ▼                                     ▼
   ┌────────────────────┐              ┌──────────────────────┐
   │  PGlite (WASM)     │              │  node-postgres Pool  │
   │  .data/pgdata      │              │  DATABASE_URL        │
   │  single process    │              │  multi-process safe  │
   └────────────────────┘              └──────────────────────┘
              │                                     │
              └──────────────┬──────────────────────┘
                             ▼
                  Drizzle ORM, one `postgresql` schema
                  drizzle/ migrations, applied at runtime
```

Because both branches are Postgres, there is **one** schema, **one** set of migrations and **one** dialect. No SQLite/Postgres translation layer, no `IF NULL` versus `COALESCE` drift.

---

## Layers

```
Browser
  │  Server Components render the page; Client Components only where
  │  interactivity genuinely requires it (editor, theme toggle, nav drawer).
  ▼
Next.js App Router (src/app)
  │
  ├── Server Components ──► src/server/queries/*      (reads, always user-scoped)
  │
  ├── Server Actions ─────► src/server/actions/*      (mutations, POST only)
  │                              │
  │                              └──► src/server/entries/service.ts
  │                                   (logic shared with Route Handlers)
  │
  └── Route Handlers ─────► src/app/api/*             (autosave, upload, export)
                                   │
                                   ▼
                          src/db  ──►  Postgres
```

### Why Server Actions _and_ Route Handlers

Server Actions are the right tool for form submissions: they work without JavaScript, Next.js verifies the origin for CSRF, and the code lives beside the UI.

The editor's autosave is different. It fires every second or so, needs a JSON response, and must not trigger a re-render. That is a `PATCH` to `/api/entries/[id]`.

Both paths call the same `applyEntryPatch` in `src/server/entries/service.ts`, so the behaviour cannot diverge.

> **A `"use server"` file may only export async functions.** Zod schemas and helpers live in a plain module next door. This is why `entryPatchSchema` is in `service.ts` and not in `actions/entries.ts`.

---

## Data model

Fourteen tables, all user-scoped except the shared prompt library.

```
users ─┬─ sessions          opaque tokens, only SHA-256 hashes stored
       ├─ accounts          OAuth links (Google, GitHub)
       ├─ chapters ─┐       the shape of the story
       │            └─ entries ──┬─ entryTags ── tags
       │                         ├─ entryPeople ─ people
       │                         └─ media ─────── uploaded photos
       ├─ milestones        dated life events (the timeline)
       ├─ legacyContacts    named readers of "legacy" entries
       └─ exports           history of what has been taken off the platform

prompts                     shared across all users, seeded, not user data
```

Foreign keys cascade, so deleting a user removes everything they own. Uploads are deleted **first**, explicitly, because database rows cascade and blobs do not.

### Every query is scoped

There is no `getEntry(id)` — only `getEntry(userId, id)`. This is deliberate: ownership is enforced in the `WHERE` clause, not by a check afterwards that someone could forget to write.

---

## Authentication

| Piece            | Choice                                                                    | Why                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Password hashing | **scrypt**, from `node:crypto`                                            | Memory-hard, ships with Node. Argon2 is marginally better but every package needs a toolchain — and the first thing that breaks on a fresh Windows laptop is a native build. |
| Sessions         | Opaque 32-byte tokens; **SHA-256 hash** stored in the database            | Revocable, and a database leak yields no usable tokens.                                                                                                                      |
| Cookies          | `httpOnly`, `sameSite=lax`, `Secure` in production, 30-day sliding expiry | Standard hardening.                                                                                                                                                          |
| CSRF             | Next.js protects Server Actions by origin automatically                   | Nothing to configure.                                                                                                                                                        |
| OAuth            | Hand-rolled OAuth 2.0 with PKCE                                           | ~200 lines instead of a heavyweight dependency. Adding credentials to `.env` makes the button appear; no code changes.                                                       |
| Single-user mode | `AUTH_MODE=single`                                                        | For a personal install, the session layer returns a local owner account when there is no cookie. No sign-in step at all.                                                     |

---

## Storage

One interface, two drivers (`src/lib/storage/`):

- **disk** (default) — files under `EVERSTORY_DATA_DIR/uploads`, outside `public/`, so they can never be guessed or hot-linked. Served through `/api/media/[id]`, which checks ownership.
- **s3** — AWS SigV4 signed by hand with `node:crypto`. Works with AWS S3, Cloudflare R2, MinIO, Backblaze B2, Hetzner and Supabase Storage.

Keys are built as `u/<userId>/<year>/<month>/<random>.<ext>` — the user id in the path makes per-user cleanup trivial and means a leaked key cannot address another writer's files. Storage keys are validated against a strict allowlist before use.

---

## Export

`buildBook()` assembles the memoir into a format-neutral structure. Four renderers consume it, so the formats can never disagree about what is included.

| Format   | Implementation                                                                                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Markdown | String building. The most future-proof option there is.                                                                                                     |
| HTML     | Self-contained file with embedded CSS and a `@media print` block — the browser produces the PDF, with better typography than any library we could bundle.   |
| JSON     | Every field, versioned, for moving to another tool.                                                                                                         |
| EPUB     | EPUB 3 is a ZIP with a known layout, so `jszip` alone is enough. `mimetype` goes first and uncompressed; photos are embedded so the file is self-contained. |

**No PDF library.** PDF generation is where native dependencies and platform-specific font problems live. Print-to-PDF is better output and zero dependencies.

---

## Markdown safety

Writers paste text, not markup. Rendered output is also served on public share pages, so:

- Rendering happens on the **server** (`/api/preview`, and at export time)
- `marked` converts; `sanitize-html` strips scripts, event handlers and `javascript:` URLs
- External links get `rel="noopener noreferrer nofollow"` automatically
- The sanitiser never runs in the browser, where a crafted client could bypass it

---

## Testing

- **Unit** — text utilities, password hashing, Markdown sanitisation, export renderers
- **Integration** — a real database, real migrations, real queries, real ownership rules
- **CI matrix** — Ubuntu, macOS and Windows, on every push
- **Postgres job** — the whole suite against a real server, proving the two database paths are equivalent
- **Docker job** — build the image, boot it, run `scripts/smoke.mjs` against it

Tests use `EVERSTORY_DATA_DIR=.data/test`, so they never touch development data. They run in a single fork because the embedded database is single-process.

---

## What this design gives up

Stated plainly, because every architecture is a trade:

- **The embedded database is single-process.** You cannot scale horizontally without moving to Postgres. That is a documented, one-variable switch.
- **Migrations run at startup** rather than as a separate release step. Convenient for a personal install; for a serious deployment, run `npm run db:migrate` deliberately first.
- **No full-text search.** Postgres has it, but the embedded engine's behaviour differs enough that we use `ILIKE` for now.
- **No email sending**, so no password reset by email. Password changes require the current password; single-user mode requires none.
