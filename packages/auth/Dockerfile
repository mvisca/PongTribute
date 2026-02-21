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
RUN rm -rf /app/packages/auth/dist /app/packages/auth/*.tsbuildinfo
RUN pnpm --filter @transcendence/shared build
RUN pnpm --filter @transcendence/auth build


FROM node:20-bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
  curl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/auth/dist ./packages/auth/dist
COPY --from=build /app/packages/auth/package.json ./packages/auth/package.json

WORKDIR /app/packages/auth
EXPOSE 3002
CMD ["node", "dist/src/server.js"]