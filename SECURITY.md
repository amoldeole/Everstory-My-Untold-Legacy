# Security policy

## Supported versions

| Version         | Supported           |
| --------------- | ------------------- |
| `main` (latest) | ✅                  |
| Older commits   | ❌ — please upgrade |

Everstory is young and moves quickly. We fix security issues on `main`.

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Instead, use GitHub's private reporting:

<https://github.com/amoldeole/Everstory-My-Untold-Legacy/security/advisories/new>

Include:

- What the issue is and who can exploit it
- Steps to reproduce (a minimal sequence is ideal)
- The impact as you see it
- Whether you have a suggested fix

**What to expect:** we aim to acknowledge within 72 hours and to ship a fix or a mitigation within 30 days for confirmed issues. We will keep you informed and will credit you in the release notes unless you prefer otherwise.

## What we protect

This application holds people's private memories — often the most personal things they have ever written down. That raises the bar.

### Current posture

| Area             | Implementation                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| Password storage | scrypt (N=16384, r=8, p=1) with a per-password 16-byte salt, from Node's standard library                        |
| Sessions         | Opaque 256-bit random tokens; only the SHA-256 hash is stored, so a database leak yields no usable tokens        |
| Session cookies  | `httpOnly`, `sameSite=lax`, `Secure` in production, sliding 30-day expiry                                        |
| CSRF             | Next.js verifies the origin of Server Actions automatically; OAuth uses `state` (and PKCE where supported)       |
| Authorisation    | Every query is scoped by user id in the `WHERE` clause — there is no unscoped lookup path                        |
| Uploads          | Strict MIME allowlist, size limits, rate limiting, generated storage keys, path-traversal checks                 |
| File serving     | Uploads live outside `public/` and are served only through `/api/media/[id]`, which checks ownership             |
| Markdown         | Rendered and sanitised on the **server**; scripts, event handlers and `javascript:` URLs are stripped            |
| Share links      | 128-bit unguessable tokens, revocable, `noindex`                                                                 |
| Password changes | Invalidate every other session                                                                                   |
| Login timing     | A dummy hash is verified even when the account does not exist                                                    |
| Transport        | Assumed to be terminated in front of the app (Caddy, nginx, a load balancer); cookies are `Secure` in production |

### Out of scope by design

- **No email is sent**, so there is no email-based password reset. Changing a password requires the current one. If you lock yourself out of a self-hosted install, use `npm run db:reset` or update the row directly.
- **No rate limiting on login attempts** beyond what a reverse proxy provides. Put the app behind something that rate-limits if it is publicly reachable.
- **The embedded database has no network surface**, but it is also unauthenticated to anything that can read the data directory. Protect `.data/`.

## Hardening a public deployment

1. **Terminate TLS in front of the app.** Session cookies are `Secure` in production and will not be sent over plain HTTP.
2. **Use a real Postgres server**, not the embedded database, if more than one person will write.
3. **Set `ALLOW_SIGNUP=false`** once your accounts exist.
4. **Back up** the database and the uploads volume. Exports are a safety net against lock-in, not a backup.
5. **Rate limit** `/login` and `/api/upload` at the proxy.
6. **Keep the image current** — CI publishes a fresh `ghcr.io/amoldeole/everstory:main` on every push.
7. **Run as non-root.** The published image already does.

## If you self-host for other people

You become the data controller for their memories. That means you owe them a backup, an upgrade path and a way to leave. The Export page exists precisely so that last part is never in doubt.
