FROM node:20-bookworm-slim AS build

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

  RUN corepack enable

  # ---- dependency manifests (better docker cache) ----
  COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
  COPY packages/shared/package.json packages/shared/package.json
  COPY packages/gateway/package.json packages/gateway/package.json
  
  RUN pnpm install --frozen-lockfile
  
  # ---- source code ----
  COPY packages/shared packages/shared
  COPY packages/gateway packages/gateway
  
  # ---- build ----
  RUN pnpm --filter @transcendence/shared build
  RUN pnpm --filter @transcendence/gateway build
  RUN pnpm --filter @transcendence/gateway deploy --prod --legacy /deploy
  
  

FROM node:20-bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /deploy/node_modules ./node_modules
COPY --from=build /app/packages/gateway/dist ./dist
COPY --from=build /app/packages/gateway/package.json ./package.json
COPY --from=build /app/packages/shared/dist ./node_modules/@transcendence/shared/dist

EXPOSE 3000
CMD ["node", "dist/server.js"]