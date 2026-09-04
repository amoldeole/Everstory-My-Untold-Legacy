# Deploying Everstory

Everstory has two deployment paths. Pick whichever fits; both are wired into GitHub Actions and both use the same build.

| Path             | Best for                                      | Database                             | Stateful? |
| ---------------- | --------------------------------------------- | ------------------------------------ | --------- |
| **Docker image** | VPS, Fly.io, Render, Railway, Kubernetes, NAS | Postgres (or embedded with a volume) | Yes       |
| **Vercel**       | Zero-ops serverless                           | Hosted Postgres only                 | No        |

> **Rule of thumb:** if you want to keep uploads on local disk, deploy the container to a host with a persistent volume. If you want serverless, use hosted Postgres **and** S3-compatible storage.

---

## Before you deploy

Three values matter in production, and two of them are easy to get wrong:

| Variable              | Why it matters                                                                                                                                                                                |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL` | **Baked into the browser bundle at build time.** Share links and OAuth callbacks will point at whatever this was when the image was built. Set it as a build arg, not just a runtime env var. |
| `APP_URL`             | Used server-side at runtime for the same purposes.                                                                                                                                            |
| `ALLOW_SIGNUP`        | Defaults to `false` in production. Set it to `true` if you want an open registration page.                                                                                                    |

Generate a session secret if you put a load balancer in front that sets `X-Forwarded-For`, and **always terminate TLS in front of the app** — session cookies are marked `Secure` in production and will not be sent over plain HTTP.

---

## 1. Docker image (any host)

CI builds and publishes a multi-architecture image (`linux/amd64` + `linux/arm64`) to GitHub Container Registry on every push to `main`, and tags releases on `v*.*.*`.

```bash
docker pull ghcr.io/amoldeole/everstory:main
```

### Single container with Postgres

```bash
docker run -d --name everstory -p 3000:3000 \
  -e DATABASE_URL=postgres://user:pass@db-host:5432/everstory \
  -e APP_URL=https://everstory.example.com \
  -e ALLOW_SIGNUP=false \
  -v everstory-data:/app/.data \
  ghcr.io/amoldeole/everstory:main

# Apply migrations once, before or right after starting
docker run --rm \
  -e DATABASE_URL=postgres://user:pass@db-host:5432/everstory \
  ghcr.io/amoldeole/everstory:main npm run db:migrate
```

### Single container, no Postgres

The image falls back to the embedded database, which works fine for one container with a persistent volume:

```bash
docker run -d --name everstory -p 3000:3000 \
  -e APP_URL=https://everstory.example.com \
  -v everstory-data:/app/.data \
  ghcr.io/amoldeole/everstory:main
```

> Only **one** process may hold the embedded database. Never scale this configuration past a single replica.

### Docker Compose

```bash
docker compose up --build      # app + Postgres 18, with healthchecks and volumes
```

Edit `docker-compose.yml` to set `NEXT_PUBLIC_APP_URL` before building, since it is compiled into the client bundle.

### Building the image yourself

```bash
# Single architecture, for the machine you are on
docker build -t everstory .

# Multi-architecture (requires buildx)
docker buildx build --platform linux/amd64,linux/arm64 -t everstory .
```

The image runs as a non-root user, exposes port 3000, and declares a healthcheck against `/api/health`.

---

## 2. Fly.io

```bash
fly launch --image ghcr.io/amoldeole/everstory:main
fly postgres create --name everstory-db
fly postgres attach everstory-db --app everstory

fly secrets set \
  APP_URL=https://your-app.fly.dev \
  ALLOW_SIGNUP=false

# Create a volume for uploads, then attach it in fly.toml:
fly volumes create everstory_data --size 1 --region bom
```

```toml
# fly.toml
[build]
  image = "ghcr.io/amoldeole/everstory:main"

[[mounts]]
  source = "everstory_data"
  destination = "/app/.data"

[[services]]
  internal_port = 3000
  protocol = "tcp"
  [[services.ports]]
    handlers = ["http"]
    port = 80
  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

[env]
  EVERSTORY_DATA_DIR = "/app/.data"
```

The Mumbai region (`bom`) is a good default if your writers are in India.

---

## 3. Render

Create a **Blueprint** from this repo, or manually:

1. **Web Service** → _Deploy an existing image_ → `ghcr.io/amoldeole/everstory:main`
2. Add a **Disk**: mount path `/app/.data`, size 1 GB
3. Add a **PostgreSQL** database and copy its _Internal Database URL_ into `DATABASE_URL`
4. Environment: `APP_URL`, `ALLOW_SIGNUP`, `EVERSTORY_DATA_DIR=/app/.data`
5. Health check path: `/api/health`

The included `render.yaml`-style settings also work if you prefer infrastructure-as-code — see `docker-compose.yml` for the equivalent variable set.

---

## 4. Railway

1. _New Project_ → _Deploy from GitHub repo_
2. Add the **PostgreSQL** plugin; Railway injects `DATABASE_URL` automatically
3. Add a **Volume** mounted at `/app/.data`
4. Set `APP_URL` and `NEXT_PUBLIC_APP_URL` to the generated domain, then redeploy

---

## 5. Any VPS (Ubuntu, with Caddy for HTTPS)

```bash
# On the server
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs caddy postgresql

# Database
sudo -u postgres createuser everstory --pwprompt
sudo -u postgres createdb everstory --owner everstory

# Application
git clone https://github.com/amoldeole/Everstory-My-Untold-Legacy.git /srv/everstory
cd /srv/everstory
npm ci
npm run build
npm run db:migrate
npm run db:seed
```

`/etc/systemd/system/everstory.service`:

```ini
[Unit]
Description=Everstory
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/srv/everstory
EnvironmentFile=/srv/everstory/.env.local
ExecStart=/usr/bin/node /srv/everstory/node_modules/.bin/next start -p 3000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```ini
# /etc/systemd/system/everstory.service — required environment
# DATABASE_URL=postgres://everstory:...@localhost:5432/everstory
# APP_URL=https://everstory.example.com
# NEXT_PUBLIC_APP_URL=https://everstory.example.com
# NODE_ENV=production
# EVERSTORY_DATA_DIR=/srv/everstory/.data
```

`/etc/caddy/Caddyfile` — Caddy obtains and renews TLS automatically:

```
everstory.example.com {
    reverse_proxy localhost:3000
}
```

```bash
sudo systemctl enable --now everstory
sudo systemctl reload caddy
```

---

## 6. Vercel (serverless)

Vercel cannot use the embedded database (the filesystem is read-only and instances are ephemeral), so you need hosted Postgres — [Neon](https://neon.tech), [Supabase](https://supabase.com), RDS or Cloud SQL. For uploads, set `STORAGE_DRIVER=s3`.

1. Import the repository at [vercel.com/new](https://vercel.com/new)
2. Add environment variables: `DATABASE_URL`, `APP_URL`, `NEXT_PUBLIC_APP_URL`, `ALLOW_SIGNUP`
3. Deploy

The included workflow `.github/workflows/deploy-vercel.yml` automates this: it applies migrations first, then deploys, so new code never boots against an old schema. Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `DATABASE_URL` and `APP_URL` as repository secrets.

---

## Migrations in production

Migrations are applied **at runtime** from the `drizzle/` folder, which is baked into the image. That is convenient, but for anything important you should apply them as a deliberate step:

```bash
# Any environment with the app checked out
DATABASE_URL=... npm run db:migrate
```

In a container:

```bash
docker run --rm -e DATABASE_URL=... ghcr.io/amoldeole/everstory:main npm run db:migrate
```

Run migrations **before** rolling out new code. The Vercel workflow does this as a separate job that gates the deployment.

---

## Backups

**Postgres:**

```bash
pg_dump --no-owner --format=custom "$DATABASE_URL" > everstory-$(date +%F).dump
```

**Embedded (`STORAGE_DRIVER=disk`):** back up the whole data directory — the database _and_ the uploads:

```bash
tar -czf everstory-$(date +%F).tar.gz .data
```

**Exports are not backups.** They are a safety net against lock-in. Keep both.

A nightly cron is enough for a personal installation:

```cron
0 3 * * * cd /srv/everstory && pg_dump --no-owner -Fc "$DATABASE_URL" > /srv/backups/everstory-$(date +\%F).dump
```

---

## Moving from the embedded database to Postgres

1. Start the new Postgres server (see `docker-compose.yml`)
2. Point the app at it: `DATABASE_URL=postgres://...`
3. `npm run db:migrate` — creates the schema
4. `npm run db:seed` — loads the prompt library (it is idempotent)
5. Move your writing with the JSON export/import, or with `pg_dump` if you are comfortable with SQL

> There is no automatic migration tool between the two engines yet. For a single user, the fastest reliable path is: export JSON, point at Postgres, migrate, then re-import. Contributions welcome.

---

## Health checks

`GET /api/health` returns 200 with JSON describing the database connection, Node version and uptime, and 503 if the database is unreachable. Use it for:

- Docker `HEALTHCHECK` (already configured in the Dockerfile)
- Kubernetes `livenessProbe` / `readinessProbe`
- Load balancer target group health checks
- `node scripts/smoke.mjs --url https://your-deployment` after a deploy
