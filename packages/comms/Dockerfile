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
RUN rm -rf /app/packages/comms/dist /app/packages/comms/*.tsbuildinfo
RUN pnpm --filter @transcendence/shared build
RUN pnpm --filter @transcendence/comms build

WORKDIR /app/packages/comms
EXPOSE 3005
CMD ["node", "dist/server.js"]
