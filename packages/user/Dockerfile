FROM node:20-bookworm-slim AS build

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

  RUN corepack enable

  # ---- dependency manifests (better docker cache) ----
  COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
  COPY packages/shared/package.json packages/shared/package.json
  COPY packages/user/package.json packages/user/package.json
  
  RUN pnpm install --frozen-lockfile
  
  # ---- source code ----
  COPY packages/shared packages/shared
  COPY packages/user packages/user
  
  # ---- build ----
  RUN pnpm --filter @transcendence/shared build
  RUN pnpm --filter @transcendence/user build
  RUN pnpm --filter @transcendence/user deploy --prod --legacy /deploy
  
  
FROM node:20-bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /deploy/node_modules ./node_modules
COPY --from=build /app/packages/user/dist ./dist
COPY --from=build /app/packages/user/src/schemas ./dist/src/schemas
COPY --from=build /app/packages/user/package.json ./package.json
COPY --from=build /app/packages/shared/dist ./node_modules/@transcendence/shared/dist

EXPOSE 3001
CMD ["node", "dist/src/server.js"]