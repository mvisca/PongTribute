*This project has been created as part of the 42 curriculum by <login1>[, <login2>[, <login3>[...]]].*

## Description

**Project name**: Transcendence

**One-liner**: A full-stack, containerized web app for **ft_transcendence** featuring secure authentication (incl. **2FA**), social features (friends + presence), and a real-time Pong-like game (including a bot opponent).

**Goal**: Build a modern, production-like web application that combines user management, real-time features, and gameplay—deployable with a single command via Docker Compose.

**Key features (high-level)**:
- **Authentication**: register/login/logout/refresh, **2FA (TOTP + backup codes)**, password reset by email.
- **User profile**: profile management, avatar upload, account deletion.
- **Friends + presence**: friend requests/accept/reject/remove + online/offline presence via WebSockets.
- **Game**: real-time Pong-like matches over WebSockets, matchmaking, match history, and a bot opponent.

**Architecture (high-level)**:
- **Frontend**: React SPA (Vite) served via `nginx`
- **Backend**: Node.js services (containerized): `gateway`, `auth`, `user`, `game`, `comms`, `images`, `bot`
- **Data stores**: Redis + SQLite (per-service) with Docker volume mounts  
- **Entry point**: `nginx` (ports **8080/8443**), reverse-proxying the internal services

---

## Instructions

### Prerequisites

- **Docker** and **Docker Compose**
- **make**
- **A local `.env` file** (see `.env.example`)

### Setup

1. Create your `.env` file:

```bash
cp .env.example .env
```

2. Set required environment variables:

Core variables (see `.env.example` for the full list):

- **Global**
  - `NODE_ENV`, `LOG_LEVEL`, `UID`, `GID`
- **Secrets**
  - `JWT_SECRET` (JWT signing)
  - `SERVICE_SECRET` (service-to-service auth, e.g. `X-Service-Secret`)
  - `COOKIE_SECRET`
- **Redis**
  - `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`
- **Gateway**
  - `GATEWAY_PORT`, `CORS_ORIGIN`, `WS_ALLOWED_ORIGINS`, plus WS and request limits
  - `DOCS_USER`, `DOCS_PASS` (Basic Auth for `/docs`)
- **SQLite persistence**
  - `USER_SERVICE_DB_PATH`, `USER_SERVICE_DB_FILENAME`
  - `GAME_SERVICE_DB_PATH`, `GAME_SERVICE_DB_FILENAME`
- **Frontend**
  - `VITE_API_URL`, `VITE_WS_COMMS_URL`, `VITE_WS_GAME_URL`, `VITE_DEFAULT_AVATAR`
- **Email (password reset)**
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
  - `RESET_URL_BASE`, `RESET_TTL_SECONDS`
- **Images**
  - Cloudinary credentials (`CLOUDINARY_*`)

3. Ensure certificates exist (HTTPS):
- Docker `nginx` will **auto-generate self-signed dev certs** (`tls.crt` / `tls.key`) if missing.
- The generated certs are stored in `packages/nginx/certs/` (mounted into the container).
- `HOST_UID` / `HOST_GID` are passed so the cert files are owned by your user on the host.

### Deploy with the Makefile

The app is deployed using the **Makefile**. No Node.js or pnpm is required on the host; everything runs inside Docker.

**Start the stack** (build images and start containers; no-op if already running):

```bash
make
# or: make up_build
```

**Makefile targets** (run `make help` for the full list):

| Target | Description |
|--------|-------------|
| `make` / `make all` | Start stack (build + up), then open browser. No-op if already running. |
| `make up_build` | Build images and start containers. No-op if already running. |
| `make up` | Start containers only (no build). No-op if already running. |
| `make build` | Build Docker images only. |
| `make rebuild` | Force rebuild and start (`docker compose up -d --build`). |
| `make re` | Rebuild stack and open browser. |
| `make debug` | Build and start in foreground (logs in terminal). |
| `make down` | Stop and remove containers and network. Keeps images and volumes. |
| `make stop` | Stop containers (no remove). Use `make up` to start again. |
| `make clean` | Down + remove locally built images. Keeps volumes (data). |
| `make fclean` | Down + remove local images + remove volumes (full reset, data lost). |
| `make nuke` | Remove DB files, dev TLS certs, then `docker system prune -a -f --volumes`. Destructive. |
| `make logs` | Follow Docker Compose logs. |
| `make ps` | List running containers. |
| `make open-browser` | Open https://localhost in the default browser. |
| `make download` | Pull required base images from AWS Public ECR. |

### Run in development mode (optional)

If you have **Node.js** and **pnpm** installed, you can run services locally for development (see root `package.json` scripts: `pnpm dev`, `pnpm start:dev-gateway`, etc.).

### Access

- **Web app**: `https://localhost/`
- **API (via gateway)**: `https://localhost/api/*`
- **WebSockets (via gateway)**:
  - Comms: `wss://localhost/api/comms/ws`
  - Game: `wss://localhost/api/game/ws`
- **Docs (Swagger)**: `https://localhost/docs` (Basic Auth via `DOCS_USER` / `DOCS_PASS`)
- **Healthcheck**: `https://localhost/health` (served by `nginx`)

### Troubleshooting

- **See logs**:

```bash
pnpm docker:logs
```

- **Redis CLI**:

```bash
pnpm redis:cli
```

- <PLACEHOLDER: common issues (certs, ports in use, UID/GID, volumes permissions, VITE_* URLs, etc.)>

---

## Team Information

Fill this for **each** team member listed in the first line.

| 42 login | Name | Role(s) | Responsibilities |
|---|---|---|---|
| <PLACEHOLDER> | <PLACEHOLDER> | PO | <PLACEHOLDER: product vision, backlog, validation, stakeholder comms> |
| <PLACEHOLDER> | <PLACEHOLDER> | PM / Scrum Master | <PLACEHOLDER: planning, tracking, removing blockers, facilitation> |
| <PLACEHOLDER> | <PLACEHOLDER> | Tech Lead / Architect | <PLACEHOLDER: architecture, key decisions, code quality, reviews> |
| <PLACEHOLDER> | <PLACEHOLDER> | Developer | <PLACEHOLDER: features implemented, ownership areas> |
| <PLACEHOLDER> | <PLACEHOLDER> | Developer | <PLACEHOLDER: features implemented, ownership areas> |

---

## Project Management

**How we organized the work**:
- <PLACEHOLDER: e.g., weekly planning + daily async updates + sprint reviews>
- <PLACEHOLDER: how tasks were split and tracked>

**Tools**:
- <PLACEHOLDER: GitHub Issues / Projects / Trello / Notion / etc.>

**Communication**:
- <PLACEHOLDER: Discord/Slack channel(s), meeting cadence, decision records>

---

## Technical Stack

### Frontend
- **React** (SPA) + **React Router**
- **Vite** (dev/build)
- **Tailwind CSS**
- **Zustand** (state management)
- **BabylonJS** (game renderer)

### Backend
- **Runtime**: Node.js
- **Framework**: Fastify (services + gateway)
- **Auth**: JWT + refresh tokens, optional 2FA (TOTP + backup codes)
- **Real-time**: WebSockets (game + comms) proxied via gateway + nginx

### Database / Storage
- **Redis**: inter-service events + pub/sub, matchmaking/queues/state, password-reset TTLs (see `.env.example`).
- **SQLite (better-sqlite3)**: per-service persistence for `user` and `game`.
- **Persistence**: SQLite DB directories are mounted as Docker volumes using `USER_SERVICE_DB_PATH` and `GAME_SERVICE_DB_PATH`.

### DevOps / Deployment
- **Docker Compose** to run the full stack with one command
- **nginx** as reverse proxy and HTTPS termination
- <PLACEHOLDER: CI/CD, monitoring, logging, etc. if applicable>

### Justification for major technical choices
- <PLACEHOLDER: why this frontend framework>
- <PLACEHOLDER: why microservices vs monolith>
- <PLACEHOLDER: why Redis and the selected DB>
- <PLACEHOLDER: why nginx / HTTPS approach>

---

## Database Schema

Provide a **visual diagram** or a clear description.

### User service (SQLite)

DB file: `packages/user/db/<user.db>` (path is configured via `USER_SERVICE_DB_*`).

- `users`
  - `id`, `username`, `email`, `password_hash`, `avatar`
  - `is_online`, `is_deleted`
  - `has_2fa_enabled`, `backup_code_hash`, `totp_secret`
  - `last_logout_at`, `created_at`, `updated_at`
- `refresh_tokens`
  - `id`, `user_id`, `token_hash`, `expires_at`, `is_2fa_verified`, `created_at`
- `friendships`
  - `user_id`, `friend_id`, `initiator_id`, `status`, `created_at`, `updated_at`

### Game service (SQLite)

DB file: `packages/game/db/<game.db>` (path is configured via `GAME_SERVICE_DB_*`).

- `matches` (denormalized 1v1)
  - `id`, `status`, `winner_id`
  - `player1_*` fields (id/username/avatar/score)
  - `player2_*` fields (id/username/avatar/score, nullable while waiting)
  - `game_mode`, `target_score`, `created_at`, `finished_at`
- `tournaments`
  - `id`, `name`, `status`, `winner_id`, `created_at`, `finished_at`
- `tournament_participants`
  - `tournament_id`, `user_id`, `alias`

---

## Features List

List **all implemented features**, who worked on them, and what they do.

| Feature | Description | Owner(s) | Status |
|---|---|---|---|
| Auth: register/login/logout/refresh | Secure auth flows (JWT + refresh tokens). | <PLACEHOLDER> | <PLACEHOLDER: done/in progress> |
| 2FA (TOTP + backup codes) | Setup and verification during login. | <PLACEHOLDER> | <PLACEHOLDER> |
| Password reset | Email-based reset with TTL. | <PLACEHOLDER> | <PLACEHOLDER> |
| Profile | View/update user profile and settings. | <PLACEHOLDER> | <PLACEHOLDER> |
| Avatars | Upload/delete avatars via image service. | <PLACEHOLDER> | <PLACEHOLDER> |
| Friends | Friend requests + accept/reject/remove. | <PLACEHOLDER> | <PLACEHOLDER> |
| Presence (WS) | Online/offline updates to friends via comms WS. | <PLACEHOLDER> | <PLACEHOLDER> |
| Game (WS) | Real-time Pong-like match over WebSockets. | <PLACEHOLDER> | <PLACEHOLDER> |
| Matchmaking | Queue/room matching backed by Redis. | <PLACEHOLDER> | <PLACEHOLDER> |
| Match history | Persisted match records and history UI. | <PLACEHOLDER> | <PLACEHOLDER> |
| Bot opponent | Bot connects via WS and plays matches. | <PLACEHOLDER> | <PLACEHOLDER> |

---

## Modules

List all chosen modules (Major/Minor), points, justification, implementation notes, and owners.

### Selected modules and point calculation

| Category | Module | Type | Points | Owner(s) |
|---|---|---:|---:|---|
| <PLACEHOLDER> | <PLACEHOLDER> | Major/Minor | 2/1 | <PLACEHOLDER> |
| <PLACEHOLDER> | <PLACEHOLDER> | Major/Minor | 2/1 | <PLACEHOLDER> |

**Total points**: <PLACEHOLDER: e.g., 14>

### Justification and implementation

For each module:
- **Module**: <PLACEHOLDER>
  - **Why we chose it**: <PLACEHOLDER>
  - **How it was implemented**: <PLACEHOLDER>
  - **Who implemented it**: <PLACEHOLDER>

---

## Individual Contributions

Provide a detailed breakdown per person.

### <PLACEHOLDER: login/name>
- **Responsibilities**: <PLACEHOLDER>
- **Features delivered**: <PLACEHOLDER>
- **Modules delivered**: <PLACEHOLDER>
- **Notable challenges & solutions**: <PLACEHOLDER>

### <PLACEHOLDER: login/name>
- **Responsibilities**: <PLACEHOLDER>
- **Features delivered**: <PLACEHOLDER>
- **Modules delivered**: <PLACEHOLDER>
- **Notable challenges & solutions**: <PLACEHOLDER>

---

## Resources

### References

- React documentation: <PLACEHOLDER: link>
- Vite documentation: <PLACEHOLDER: link>
- Tailwind CSS documentation: <PLACEHOLDER: link>
- Fastify documentation: <PLACEHOLDER: link>
- Docker Compose documentation: <PLACEHOLDER: link>
- Nginx documentation: <PLACEHOLDER: link>
- Redis documentation: <PLACEHOLDER: link>
- WebSocket reference: <PLACEHOLDER: link>
- 42 ft_transcendence subject / evaluation notes: <PLACEHOLDER: link or internal reference>

### AI usage (mandatory transparency)

Describe exactly **how** AI was used:
- **What tasks**: <PLACEHOLDER: e.g., refactoring suggestions, debugging, drafting docs>
- **Where**: <PLACEHOLDER: folders/components/services affected>
- **What was NOT done with AI**: <PLACEHOLDER>
- **How outputs were validated**: <PLACEHOLDER: tests, peer review, manual verification>

---

## Known limitations

- <PLACEHOLDER: e.g., no Safari support yet, missing feature X, performance constraint, etc.>

## License

<PLACEHOLDER: License or \"All rights reserved\" depending on your choice.>

