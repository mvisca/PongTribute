FROM node:20-bookworm-slim AS build

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

# copy dependency manifests first (better docker cache)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/auth/package.json packages/auth/package.json

RUN pnpm install --frozen-lockfile

# copy source code after dependencies
COPY packages/shared packages/shared
COPY packages/auth packages/auth
RUN pnpm --filter @transcendence/shared build
RUN pnpm --filter @transcendence/auth build
RUN pnpm --filter @transcendence/auth deploy --prod --legacy /deploy


FROM node:20-bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /deploy/node_modules ./node_modules
COPY --from=build /app/packages/auth/dist ./dist
COPY --from=build /app/packages/auth/package.json ./package.json
COPY --from=build /app/packages/shared/dist ./node_modules/@transcendence/shared/dist

EXPOSE 3002
CMD ["node", "dist/src/server.js"]