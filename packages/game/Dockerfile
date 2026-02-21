FROM node:20-bookworm-slim AS build

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
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


FROM node:20-bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
  curl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/game/dist ./packages/game/dist
COPY --from=build /app/packages/game/package.json ./packages/game/package.json

WORKDIR /app/packages/game
EXPOSE 3003
CMD ["node", "dist/server.js"]