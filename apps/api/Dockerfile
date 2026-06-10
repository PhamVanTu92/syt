# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/ packages/
COPY apps/api/package.json apps/api/

# Install only api dependencies (including devDeps for build)
RUN pnpm install --filter @soyte/api --frozen-lockfile

# Copy api source
COPY apps/api/ apps/api/

# Generate Prisma client (uses pinned prisma from devDependencies)
RUN cd apps/api && pnpm exec prisma generate

# Build NestJS
RUN cd apps/api && pnpm exec nest build

# ─── Stage 2: Runtime ────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/ packages/
COPY apps/api/package.json apps/api/

RUN pnpm install --filter @soyte/api --frozen-lockfile --prod

# Copy built artifacts
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/apps/api/prisma apps/api/prisma

# Copy generated Prisma client from builder (avoids needing prisma CLI in prod)
COPY --from=builder /app/node_modules/.prisma node_modules/.prisma

WORKDIR /app/apps/api

# Port được đọc từ env API_PORT (default 3001)
EXPOSE 3001 3003
CMD ["node", "dist/main"]
