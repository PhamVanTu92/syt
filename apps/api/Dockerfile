# Single-stage build (test environment)
FROM node:22-alpine
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/ packages/
COPY apps/api/package.json apps/api/

# Install all dependencies (including dev — needed for prisma CLI and nest)
RUN pnpm install --filter @soyte/api --frozen-lockfile

# Copy api source
COPY apps/api/ apps/api/

# Generate Prisma client then build NestJS
RUN cd apps/api && pnpm exec prisma generate && pnpm exec nest build

WORKDIR /app/apps/api

EXPOSE 3001 3003
CMD ["node", "dist/main"]
