FROM node:20-bookworm-slim AS build_frontend

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable

COPY . .

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @transcendence/shared build
RUN pnpm --filter @transcendence/frontend build

FROM nginx:1.27-alpine

RUN apk add --no-cache openssl

# Static frontend
COPY --from=build_frontend /app/packages/frontend/dist /usr/share/nginx/html

# Nginx config
COPY packages/nginx/nginx.conf /etc/nginx/nginx.conf
COPY packages/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf

# Entrypoint: generate self-signed certs for dev if missing
COPY packages/nginx/docker-entrypoint.d/10-generate-dev-certs.sh /docker-entrypoint.d/10-generate-dev-certs.sh
RUN chmod +x /docker-entrypoint.d/10-generate-dev-certs.sh

EXPOSE 80 443

