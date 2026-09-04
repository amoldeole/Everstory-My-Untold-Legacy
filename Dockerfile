# syntax=docker/dockerfile:1
#
# Everstory — production image
#
# Multi-stage, multi-architecture (linux/amd64 + linux/arm64), runs as a
# non-root user, and ships a healthcheck. Built this way it runs unchanged on
# Fly.io, Render, Railway, Fly, Kubernetes, a Synology NAS, or a £5 VPS.

# ---------------------------------------------------------------------------
# Base: pinned Node on Alpine. Alpine keeps the image ~180 MB; `libc6-compat`
# keeps any native module that slipped in working.
# ---------------------------------------------------------------------------
FROM node:26-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---------------------------------------------------------------------------
# Dependencies: installed from the lockfile only, so the layer caches until
# package.json or package-lock.json actually changes.
# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# `NEXT_PUBLIC_APP_URL` is baked into client bundles at build time, so it has
# to be present here even though the runtime value also matters.
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# Produce the self-contained `.next/standalone` output for the runtime image.
ENV NEXT_OUTPUT=standalone

RUN npm run build

# ---------------------------------------------------------------------------
# Runtime
# ---------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Standalone server output plus the static assets it serves.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

# SQL migrations are read from disk at runtime, so they travel with the image.
COPY --from=build --chown=nextjs:nodejs /app/drizzle ./drizzle

# Public assets (favicon, robots…). Missing directory is tolerated.
COPY --from=build --chown=nextjs:nodejs /app/public ./public 2>/dev/null || true

# Writable directory for uploads and, when DATABASE_URL is unset, the embedded
# database. Mount a volume here in production.
RUN mkdir -p /app/.data && chown -R nextjs:nodejs /app/.data

USER nextjs

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV EVERSTORY_DATA_DIR=/app/.data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
