# Gateway (HTTP API)

Reverse proxy for the auth, user and game services. It only forwards HTTP traffic; WebSocket proxying will arrive in a later phase.

## Run
- `pnpm install` (from repo root)
- `pnpm --filter @transcendence/gateway start:dev` for watch mode
- `pnpm --filter @transcendence/gateway build` then `pnpm --filter @transcendence/gateway start` for production

## Env vars (defaults)
- `GATEWAY_PORT` (3000)
- `GATEWAY_HOST` (0.0.0.0)
- `AUTH_SERVICE_URL` (http://localhost:3002)
- `USER_SERVICE_URL` (http://localhost:3001)
- `GAME_SERVICE_URL` (http://localhost:3003)
- `CORS_ORIGIN` (http://localhost:5173)
- `GATEWAY_TIMEOUT_MS` (10000)
- `GATEWAY_BODY_LIMIT` bytes (10485760)

Health check: `GET /health` -> `{ status: "ok", service: "gateway", timestamp }`.

