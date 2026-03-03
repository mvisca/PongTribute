FROM node:20-bookworm-slim AS build

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable
COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @transcendence/shared build
RUN pnpm --filter @transcendence/user build
RUN cp -r /app/packages/user/src/schemas /app/packages/user/dist/src/schemas
RUN pnpm --filter @transcendence/user deploy --prod --legacy /deploy


FROM node:20-bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /deploy/node_modules ./node_modules
COPY --from=build /app/packages/user/dist ./dist
COPY --from=build /app/packages/user/package.json ./package.json
COPY --from=build /app/packages/shared/dist ./node_modules/@transcendence/shared/dist

RUN chmod -R a+rX /app
EXPOSE 3001
CMD ["node", "dist/src/server.js"]