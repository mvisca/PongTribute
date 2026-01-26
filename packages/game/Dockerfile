FROM node:20-bookworm-slim AS build

WORKDIR /app

# Native deps for better-sqlite3 + tooling (healthchecks use curl)
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  python3 \
  make \
  g++ \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

COPY . .

RUN pnpm install --frozen-lockfile
RUN rm -rf /app/packages/shared/dist /app/packages/shared/*.tsbuildinfo
RUN rm -rf /app/packages/game/dist /app/packages/game/*.tsbuildinfo
RUN pnpm --filter @transcendence/shared build
RUN pnpm --filter @transcendence/game build
RUN cp -r /app/packages/game/src/schemas /app/packages/game/dist/schemas

WORKDIR /app/packages/game
EXPOSE 3003
CMD ["node", "dist/server.js"]

