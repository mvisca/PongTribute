FROM node:20-bookworm-slim AS build

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

COPY . .

RUN pnpm install --frozen-lockfile
RUN rm -rf /app/packages/shared/dist /app/packages/shared/*.tsbuildinfo
RUN rm -rf /app/packages/comms/dist /app/packages/comms/*.tsbuildinfo
RUN pnpm --filter @transcendence/shared build
RUN pnpm --filter @transcendence/comms build


FROM node:20-bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
  curl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/comms/dist ./packages/comms/dist
COPY --from=build /app/packages/comms/package.json ./packages/comms/package.json

WORKDIR /app/packages/comms
EXPOSE 3005
CMD ["node", "dist/server.js"]