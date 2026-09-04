# Contributing

Thanks for wanting to help. Everstory is a small project with a wide surface, so there is genuinely useful work at every level.

## Getting set up

```bash
npm install
npm run db:migrate
npm run db:seed -- --demo
npm run dev
```

Before opening a pull request:

```bash
npm run ci        # typecheck + lint + test + build
```

If `npm run ci` passes locally it will pass in CI, which runs the same command on Ubuntu, macOS and Windows.

## A note if you are on Windows

Everything is designed to work there. Please **tell us if it does not** — a bug report from a Windows contributor is disproportionately valuable, because the macOS/Linux path gets far more testing.

Two things to know:

- Use npm scripts, not shell one-liners, in anything you add. `NODE_ENV=production next build` works on a Mac and fails in Command Prompt.
- `.gitattributes` forces LF line endings. If you see mysterious "file not found" errors in CI, check that your editor is not saving CRLF.

## Adding a writing prompt

The prompt library is the highest-leverage place to contribute — it is the part every writer actually reads.

Edit `src/lib/catalog/prompts.ts` and add an entry:

```ts
{
  slug: "childhood-first-bike",
  chapterSlug: "childhood",
  question: "What was the first thing you ever owned that was truly yours?",
  followUp: "Where did you keep it?",
  category: "childhood",
  position: 6,
}
```

The bar every prompt has to clear:

- **It cannot be answered in one word.** If "yes" or "blue" is a complete answer, it is not a prompt.
- **The follow-up asks for a sensory detail.** Smell, sound, weather, the position of the light. That is what makes a memory survive.
- **It works for anyone.** Not everyone had a grandparent, a bicycle or a happy childhood.

Then regenerate nothing — the prompt catalogue is seeded from this file:

```bash
npm run db:seed
```

## Adding a chapter

Edit `src/lib/catalog/chapters.ts`. Slugs are referenced by prompts, so changing one means updating the prompts that point at it. Keep the `position` values contiguous.

## Changing the database schema

1. Edit `src/db/schema.ts`
2. `npm run db:generate` — writes SQL into `drizzle/`
3. **Commit the generated migration.** Migrations are applied at runtime, so they must be in the repo and in the Docker image.
4. `npm run db:migrate` and re-run the tests

Never hand-edit a migration that has been committed and deployed; add a new one.

## Code style

Prettier owns formatting (`npm run format`), ESLint owns correctness (`npm run lint`). Do not fight either.

Conventions worth knowing:

- **Reads** live in `src/server/queries/` and are always scoped by user id.
- **Mutations** live in `src/server/actions/` (Server Actions) or `src/app/api/` (Route Handlers).
- Logic shared between the two goes in a plain module like `src/server/entries/service.ts`, because a `"use server"` file may only export async functions.
- Client Components are for interactivity only. If a component could be a Server Component, it should be one.
- Never pass a function (including an icon component) from a Server Component to a Client Component — pass a string key and resolve it on the client.

## Tests

Add a test when you fix a bug. The integration tests in `tests/integration/database.test.ts` run against a real database and are the fastest way to catch query mistakes — two of them caught a genuine bug where Drizzle rendered correlated subquery columns unqualified.

```bash
npm test                                  # everything
npx vitest run tests/unit/text.test.ts    # one file
```

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(editor): add word-count goal indicator
fix(export): escape titles in the EPUB manifest
docs(readme): clarify the single-process limit
chore(deps): bump next to 16.3.4
```

## Pull requests

- Keep them focused. One change, one PR.
- Explain _why_, not just _what_ — the code already says what.
- Screenshots for anything visual.
- Note which operating systems you tested on.
