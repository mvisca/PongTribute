*This project has been created as part of the 42 curriculum by <jocuni-p>[, <dkurcbar>[, <mvisca-g>[, <mehernan>]]].*

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

| 42 login   | Name        | Role(s)         | Responsibilities                                          |
|------------|-------------|-----------------|-----------------------------------------------------------|
| <mehernan> | <Meritxell> | Product Owner   | < product vision, backlog, validation, stakeholder comms> |
| <jocuni-p> | <Joan>      | Product Manager | < planning, tracking, removing blockers, facilitation>    |
| <mvisca-g> | <Martin>    | Tech Lead       | < architecture, key decisions, code quality, reviews>     |
| <dkurcbar> | <Diego>     | Developer       | <features implemented, ownership areas>                   |

---

## Project Management

**How we organized the work**:
At the beginning of the project, the team worked in person on campus, where we collaboratively defined the initial architecture, shared ideas, and distributed responsibilities. Tasks were initially assigned at a high level:

- One member focused on the frontend development
- One member focused on the game implementation
- Three members worked on the backend services and Docker infrastructure

During development, the project faced a significant change: one team member left and the subject requirements were updated. As a result, the team had to adapt both the scope and the organization.

- We shifted to a more flexible workflow:
- Weekly meetings to review progress and discuss blockers
- Continuous async updates between members
- Iterative improvements rather than strict sprint planning

This approach allowed us to stay aligned while adapting to changes in both team size and project requirements.

**Tools**:
- <GitHub: (repositories, version control, and collaboration)>
- <GitHubCodespaces: (early-stage frontend development and testing)>
- <Notion: (architecture planning, diagrams, and shared notes)>
- <Docker/DockerCompose (development and deployment environment)>

**Communication**:
- <Campus: (Initially, discussions were held in person on campus)>
- <WhatsApp: (The WhatsApp group became the main communication channel for daily coordination)>
- <GoogleMeet: (Weekly meetings)>
  - Share progress
  - Discuss technical challenges
  - Align next steps


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

### Justification for major technical choices
- <REACT: We chose React because it provides a flexible and component-based architecture, which is ideal for building a dynamic Single Page Application (SPA).>
- <MICROSERVICES: We opted for a microservices architecture to better separate concerns across different domains of the application (authentication, users, game, communications, etc.)>
- <REDIS: We chose Redis over other data stores because it is specifically designed for high-performance, in-memory operations, which makes it ideal for real-time systems.>
- <SQlite: We chose SQLite instead of more complex database systems (e.g., PostgreSQL or MySQL) because it provides a simple, embedded, and lightweight solution that integrates seamlessly with our architecture.>
- <NGINX: We chose nginx over alternatives because it is a high-performance, lightweight, and widely adopted reverse proxy specifically optimized for handling concurrent connections.>
- <HTTPS: We implemented HTTPS to align the project with modern web security standards, even during development.>

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

| Feature                             | Description                                     |
|-------------------------------------|-------------------------------------------------|
| Auth: register/login/logout/refresh | Secure auth flows (JWT + refresh tokens).       | 
| 2FA (TOTP + backup codes)           | Setup and verification during login.            |
| Password reset                      | Email-based reset with TTL.                     |
| Profile                             | View/update user profile and settings.          |
| Avatars                             | Upload/delete avatars via image service.        |
| Friends                             | Friend requests + accept/reject/remove.         |
| Presence (WS)                       | Online/offline updates to friends via comms WS. |
| Game (WS)                           | Real-time Pong-like match over WebSockets.      |
| Matchmaking                         | Queue/room matching backed by Redis.            |
| Match history                       | Persisted match records and history UI.         | 
| Bot opponent                        | Bot connects via WS and plays matches.          |

---

### Selected modules and point calculation

| Category           | Module                      | Type  |Point| Owner(s)                      |
|--------------------|-----------------------------|-------|-----|-------------------------------|
| <WEB>              | <Framework>                 | Major |  2  | <All>                         |
| <WEB>              | <WebSocket Game>            | Major |  2  | <jocuni-p>                    |
| <WEB>              | <Public API>                | Major |  2  | <All>                         |
| <WEB>              | <Custom-made design system> | Minor |  1  | <mehernan>>                   |
| <USER MANAGEMENTS> | <User management>           | Major |  2  | <mvisca-g, mehernan, dkurcbar>|
| <USER MANAGEMENTS> | <2FA>                       | Minor |  1  | <mvisca-g>                    |
| <AI>               | <AI Opponent>               | Major |  2  | <mvisca-g>                    |
| <GAMING>           | <Game>                      | Major |  2  | <jocuni-p>                    |
| <GAMING>           | <Remote players >           | Major |  2  | <jocuni-p>                    |
| <GAMING>           | <Customisation options>     | Minor |  1  | <jocuni-p>                    |
| <DEVOPS>           | <Backend as microservices>  | Major |  2  | <All>                         |

**Total points**:  <19>

### Justification and implementation

For each module:
- **IV.1 WEB:**: Framework
  - **Why we chose it**: We chose to use a modern frontend framework to build a structured and maintainable Single Page Application. A framework like React allows us to break the UI into reusable components, manage state efficiently, and handle routing smoothly. This was essential to keep the frontend scalable as the project includes multiple pages such as authentication, profile, friends, and the game interface.
  - **How it was implemented**: We built the frontend as a React SPA using Vite, organizing the application into reusable components (Navbar, pages, UI elements) and handling navigation with React Router. Global state (auth, friends) was managed using Zustand.
  - **Who implemented it**: All of us

- **IV.1 WEB:**: WebSocketGame
  - **Why we chose it**: We chose to use a modern frontend framework to build a structured and maintainable Single Page Application. A framework like React allows us to break the UI into reusable components, manage state efficiently, and handle routing smoothly. This was essential to keep the frontend scalable as the project includes multiple pages such as authentication, profile, friends, and the game interface.
  - **How it was implemented**: We used WebSockets to establish a persistent connection between client and server. Game state updates (player position, score, etc.) are sent in real time, allowing synchronization between players.
  - **Who implemented it**: jocuni-p

- **IV.1 WEB:**: PublicApi
  - **Why we chose it**: We chose to implement a public API to make our backend accessible and modular. This allows external clients (including our own frontend) to interact with the system in a standardized way. It also encourages good API design practices and makes the system more extensible and testable.
  - **How it was implemented**: We exposed a REST API through the gateway, where each service handles its own routes. The frontend communicates with the backend using HTTP requests for actions like authentication, profile, and friends.
  - **Who implemented it**: All of us

- **IV.1 WEB:**: Custom-made design system
  - **Why we chose it**: We decided to create our own design system to ensure visual consistency across the application. By defining reusable UI components (buttons, cards, layouts), we improved development speed and maintainability. This also allowed us to create a unique visual identity aligned with the arcade/game theme of the project.
  - **How it was implemented**: We created reusable UI components (buttons, cards, inputs) using Tailwind CSS, ensuring consistent styling across the app. These components are shared and reused in all pages.
  - **Who implemented it**: mehernan

- **IV.3 USER MANAGEMENT**: User management
  - **Why we chose it**: User management is a fundamental part of any web application. We implemented features such as registration, login, profile management, and friendships to simulate a real-world platform. This module allowed us to handle authentication flows, user data, and relationships between users.
  - **How it was implemented**: We implemented user features such as register, login, profile management, and friends using dedicated backend services. Authentication is handled with JWT, and user data is stored in SQLite.
  - **Who implemented it**: mvisca-g, mehernan, dkurcbar

- **IV.3 USER MANAGEMENT**: 2FA
  - **Why we chose it**: We chose to implement Two-Factor Authentication to enhance the security of user accounts. This module allowed us to explore real-world authentication mechanisms such as TOTP and backup codes. It also reflects modern security standards used in production applications.
  - **How it was implemented**: We added TOTP-based 2FA, generating a secret for each user and validating codes during login. Backup codes are also supported for recovery.
  - **Who implemented it**: mvisca-g

- **IV.4 ARTIFICIAL INTELLIGENCE**: AI Oponent
  - **Why we chose it**: We included an AI opponent to allow users to play even when no other players are available. This improves user experience and ensures the game is always accessible. It also gave us the opportunity to experiment with basic AI logic and game behavior simulation.
  - **How it was implemented**: We created a bot service that connects to the game via WebSockets and simulates player behavior by reacting to the game state.
  - **Who implemented it**: mvisca-g

- **IV.6 GAMING AND USER EXPERIENCE**: Game
  - **Why we chose it**: Previously, we were working on the old subject, which asked us to create a Pong game. When we switched to the new subject, we continued with the game since we had already started working on it.
  - **How it was implemented**: The game is rendered in the frontend (canvas-based), with logic for movement, collisions, and scoring. The backend synchronizes the state between players.
  - **Who implemented it**: jocuni-p

- **IV.6 GAMING AND USER EXPERIENCE**: Remote Players
  - **Why we chose it**: This also was part of the subject but also to allow users to play against each other in real time. This module complements the WebSocket system and enhances the social aspect of the platform. It also introduces challenges such as synchronization, latency handling, and session management.
  - **How it was implemented**: We used WebSockets to allow two players to connect to the same match, exchanging real-time updates to keep both views synchronized.
  - **Who implemented it**: jocuni-p

- **IV.6 GAMING AND USER EXPERIENCE**: Customisation options
  - **Why we chose it**: We added customization options to improve user engagement and personalization. Allowing users to modify aspects such as their profile or in-game elements makes the experience more interactive and tailored, which is common in modern gaming platforms.
  - **How it was implemented**: We allowed users to customize elements such as their profile (avatar, username) and prepared the structure for future game-related customization.
  - **Who implemented it**: jocuni-p

- **IV.7 DEVOPS**: Backend as microservices
  - **Why we chose it**: We chose a microservices architecture to better structure the backend by separating responsibilities into independent services (auth, user, game, etc.). This approach improves scalability, maintainability, and fault isolation. It also allowed us to simulate a production-like environment using Docker and service orchestration.
  - **How it was implemented**: We split the backend into independent services (auth, user, game, etc.), each running in its own Docker container. They communicate through a gateway and Redis when needed.
  - **Who implemented it**: mvisca-g

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

## Resources && AI
Throughout the project, we used AI tools as a support for learning and problem-solving, rather than as a replacement for our own understanding.

AI was mainly used as an interactive learning resource. It allowed us to ask direct and specific questions when facing new concepts, which helped us quickly understand unfamiliar technologies such as frontend frameworks, state management, WebSockets, and Docker-based architectures. This was especially useful when working with tools or languages that we never used before and were new to all of us.

Throughout the project, we used AI tools as a support for learning and problem-solving, rather than as a replacement for our own understanding.

AI was mainly used as an interactive learning resource. It allowed us to ask direct and specific questions when facing new concepts, which helped us quickly understand unfamiliar technologies such as frontend frameworks, state management, WebSockets, and Docker-based architectures. This was especially useful when working with tools or languages that were new to some members of the team.

Alongside AI, we relied on peer support and external learning resources. We occasionally received help from other students, especially when discussing concepts or debugging complex issues. We used YouTube tutorials and online documentation to reinforce our understanding and learn best practices.

### References (link de joan)

- React documentation: <PLACEHOLDER: link>
- Vite documentation: <PLACEHOLDER: link>
- Tailwind CSS documentation: <PLACEHOLDER: link>
- Fastify documentation: <PLACEHOLDER: link>
- Docker Compose documentation: <PLACEHOLDER: link>
- Nginx documentation: <PLACEHOLDER: link>
- Redis documentation: <PLACEHOLDER: link>
- WebSocket reference: <PLACEHOLDER: link>
- 42 ft_transcendence subject / evaluation notes: <PLACEHOLDER: link or internal reference>

---

## Known limitations

- <PLACEHOLDER: e.g., no Safari support yet, missing feature X, performance constraint, etc.>