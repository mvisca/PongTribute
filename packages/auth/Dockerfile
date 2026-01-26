FROM node:20-bookworm-slim AS build

WORKDIR /app

# Native deps for better-sqlite3 (transitive in workspace) + tooling
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  python3 \
  make \
  g++ \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

# Copy whole monorepo (filtered by .dockerignore)
COPY . .

# Install + build only what we need (but keep workspace consistent)
RUN pnpm install --frozen-lockfile
RUN rm -rf /app/packages/shared/dist /app/packages/shared/*.tsbuildinfo
RUN rm -rf /app/packages/auth/dist /app/packages/auth/*.tsbuildinfo
RUN pnpm --filter @transcendence/shared build
RUN pnpm --filter @transcendence/auth build

WORKDIR /app/packages/auth
EXPOSE 3002
CMD ["node", "dist/src/server.js"]

