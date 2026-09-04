# Everstory — My Untold Legacy

A private, guided place to write the story only you can tell.

Everstory asks you one good question at a time and keeps your answers safe. It is not a social network and not a journaling app chasing a streak. It is a quiet place to leave the things that would otherwise be lost — organised into chapters, illustrated with your photographs, and exportable to formats you will still be able to open in fifty years.

**You own the software and you own the words.** Everstory is open source, self-hostable, and every entry can be exported as Markdown, HTML, EPUB or JSON at any time.

---

## Quick start

Requires **Node.js 20.9 or newer** (22 is recommended). Nothing else — no database server, no Docker, no native toolchain.

```bash
git clone https://github.com/amoldeole/Everstory-My-Untold-Legacy.git
cd Everstory-My-Untold-Legacy
npm install
npm run db:migrate
npm run db:seed -- --demo   # optional: 90 prompts + a demo account with sample writing
npm run dev
```

Open <http://localhost:3000>.

### Windows

Every command above is identical in **PowerShell**, **Command Prompt** and **Git Bash**. The project uses npm scripts rather than shell scripts, and `.gitattributes` pins line endings to LF so nothing breaks when files are checked out on Windows.

```powershell
git clone https://github.com/amoldeole/Everstory-My-Untold-Legacy.git
cd Everstory-My-Untold-Legacy
npm install
npm run db:migrate
npm run db:seed -- --demo
npm run dev
```

### macOS / Linux

```bash
# With nvm, pin the Node version automatically:
nvm use          # reads .nvmrc (22)

npm install
npm run db:migrate
npm run db:seed -- --demo
npm run dev
```

> **Demo account** — after seeding, sign in with `demo@everstory.local` / `everstory-demo`.

---

## Why there is no database to install

Everstory ships with **PGlite** — real PostgreSQL 18 compiled to WebAssembly. It runs inside the Node process and stores its files in `.data/pgdata`.

That means a fresh clone works on a MacBook, a Windows laptop and a CI runner with zero configuration. When you are ready for a real server, set one environment variable:

```bash
DATABASE_URL=postgres://user:password@localhost:5432/everstory
```

**The schema is identical in both cases.** Same migrations, same SQL, same behaviour — the Postgres job in CI runs the whole test suite against a real server to prove it.

> ⚠️ **One process at a time.** The embedded database holds its data directory exclusively. Stop `npm run dev` before running `npm run db:seed`, `npm run db:migrate` or `npm run db:reset`. With a real Postgres server this limitation disappears.

---

## Commands

| Command                           | What it does                                                    |
| --------------------------------- | --------------------------------------------------------------- |
| `npm run dev`                     | Start the development server                                    |
| `npm run build`                   | Production build                                                |
| `npm start`                       | Serve a production build (run `build` first)                    |
| `npm test`                        | Run the test suite                                              |
| `npm run test:watch`              | Tests in watch mode                                             |
| `npm run typecheck`               | TypeScript, no emit                                             |
| `npm run lint` / `lint:fix`       | ESLint                                                          |
| `npm run format` / `format:check` | Prettier                                                        |
| `npm run db:migrate`              | Apply migrations                                                |
| `npm run db:seed -- --demo`       | Seed prompts (and optionally demo content)                      |
| `npm run db:reset`                | Delete local data (add `-- --force` for a real server)          |
| `npm run db:generate`             | Regenerate migrations after editing `src/db/schema.ts`          |
| `npm run db:studio`               | Browse the database in Drizzle Studio                           |
| `npm run doctor`                  | Diagnose the environment — run this first when something breaks |
| `npm run smoke`                   | Smoke-test a running server (`--url`, `--retries`)              |
| `npm run ci`                      | Everything CI runs, in order                                    |

---

## Configuration

Copy `.env.example` to `.env.local` and edit what you need. **Every value has a working default.**

```bash
cp .env.example .env.local        # macOS / Linux
copy .env.example .env.local      # Windows
```

The settings you are most likely to want:

| Variable                      | Default                        | Notes                                                                          |
| ----------------------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| `DATABASE_URL`                | _(unset)_                      | Unset = embedded Postgres. Set = real server.                                  |
| `NEXT_PUBLIC_APP_URL`         | `http://localhost:3000`        | Used for share links and OAuth callbacks. Baked in at **build** time.          |
| `AUTH_MODE`                   | `credentials`                  | `single` disables sign-in entirely for a one-person install.                   |
| `ALLOW_SIGNUP`                | `true` in dev, `false` in prod | Set it explicitly when you deploy.                                             |
| `STORAGE_DRIVER`              | `disk`                         | `s3` works with AWS S3, Cloudflare R2, MinIO, Backblaze B2, Hetzner, Supabase. |
| `GOOGLE_CLIENT_ID` / `SECRET` | _(unset)_                      | Adding these makes a "Continue with Google" button appear. No code changes.    |

Run `npm run doctor` to see exactly what the app has picked up.

---

## Features

- **Guided writing** — 15 chapters and 90 prompts, written so none can be answered in one word. Each prompt carries a follow-up that asks for a sensory detail, because that is the part that makes a memory survive.
- **A calm editor** — Markdown, autosave, keyboard shortcuts, live word count, server-side preview. Photos attach to the memory itself, not to a separate gallery.
- **Timeline** — dated entries and explicit milestones, in order, grouped by year.
- **People** — the cast of your story. Tag someone on an entry and their memories gather on their card.
- **Sharing** — private by default. Publish one entry with a link, or mark it "legacy" for the people you name in Settings.
- **Export** — EPUB (a real ebook with a table of contents), HTML (print to PDF from any browser), Markdown, and a complete JSON archive.
- **Dark mode**, keyboard shortcuts, and a layout that works on a phone.

---

## Testing

```bash
npm test                    # 81 tests, unit + integration
npm run test:watch
npm run ci                  # typecheck, lint, test, build — exactly what CI runs
```

Tests run against a real database (embedded by default, real Postgres in CI), in a scratch directory at `.data/test`, so they never touch your development data.

CI runs on **Ubuntu, macOS and Windows** on every push and pull request, and includes a job that boots the Docker image and smoke-tests it.

---

## Deployment

Everstory deploys two ways, and both are wired up in GitHub Actions:

1. **Docker image → any host.** `ghcr.io/amoldeole/everstory` is built for `linux/amd64` and `linux/arm64` on every push to `main`. Works on Fly.io, Render, Railway, Kubernetes, a NAS, or a VPS.
2. **Vercel (serverless).** Uses the same codebase with a hosted Postgres database.

```bash
docker run -d -p 3000:3000 \
  -e DATABASE_URL=postgres://... \
  -e NEXT_PUBLIC_APP_URL=https://everstory.example.com \
  -v everstory-data:/app/.data \
  ghcr.io/amoldeole/everstory:main
```

📄 **[Full deployment guide → DEPLOYMENT.md](DEPLOYMENT.md)** — Docker Compose, Fly.io, Render, Railway, a VPS with Caddy, Vercel, backups, and how to move from the embedded database to Postgres.

---

## Project layout

```
src/
  app/
    (auth)/            Sign-in and sign-up
    (vault)/           The authenticated app (dashboard, editor, chapters…)
    api/               Route handlers: entries, upload, export, health, oauth
    share/[token]/     Public read-only entry
    legacy/[token]/    Read-only legacy view for named contacts
  components/          UI, layout and the editor
  db/                  Schema, migrations and the driver factory
  lib/
    auth/              Passwords, sessions, OAuth providers
    catalog/           The chapter and prompt libraries
    export/            Book assembly and the Markdown/HTML/JSON/EPUB renderers
    storage/           Disk and S3 drivers behind one interface
  server/
    actions/           Server Actions (mutations)
    api/               Shared Route Handler helpers
    queries/           Read queries, all scoped by user
tests/                 Unit and integration tests
drizzle/               Generated SQL migrations (committed)
scripts/               migrate, seed, reset, doctor, smoke
```

📄 **[Architecture notes → ARCHITECTURE.md](ARCHITECTURE.md)**

---

## Security

Passwords are hashed with scrypt (memory-hard, from Node's standard library — no native modules to compile). Sessions are opaque random tokens; only a SHA-256 hash is stored, so a database leak does not hand an attacker usable sessions. Every query is scoped by user id at the SQL level, uploads live outside the web root and are served through an authorising route, and rendered Markdown is sanitised on the server.

Please report vulnerabilities privately — see [SECURITY.md](SECURITY.md).

---

## Contributing

Bug reports, prompt suggestions and pull requests are all welcome. Prompts in particular: if you have a question that opened a door for you, add it to `src/lib/catalog/prompts.ts`.

📄 **[Contributing guide → CONTRIBUTING.md](CONTRIBUTING.md)**

---

## Licence

MIT — see [LICENSE](LICENSE).
