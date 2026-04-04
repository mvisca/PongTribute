*This project has been created as part of the 42 curriculum by jocuni-p, dkurcbar, mvisca-g and mehernan.*

## Description

**Project name**: Transcendence

**One-liner**: A full-stack, containerized web app for **ft_transcendence** featuring secure authentication (incl. **2FA**), social features (friends + presence), and a real-time Pong-like game (including a bot opponent).

**Goal**: Build a modern, production-like web application that combines user management, real-time features, and gameplay—deployable with a single command via Docker Compose.

**Key features (high-level)**:
- **Authentication**: register/login/logout/refresh, **2FA (TOTP + backup code)**, password reset by email.
- **User profile**: profile management, avatar upload, account deletion.
- **Friends + presence**: friend requests/accept/reject/remove + online/offline presence via WebSockets.
- **Game**: real-time Pong-like matches over WebSockets, matchmaking, match history, and a bot opponent.

**Architecture (high-level)**:
- **Frontend**: React SPA (Vite) served via `nginx`
- **Backend**: Node.js services (containerized): `gateway`, `auth`, `user`, `game`, `comms`, `images`, `bot`
- **Data stores**: Redis + SQLite (game & user) with Docker volume mounts  
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

-  Note: The name of the head branch is `42-compatible`

```bash
make
# or: make up_build
```

**Makefile targets** (run `make help` for the full list):

| Target              | Description                                                                              |
|---------------------|------------------------------------------------------------------------------------------|
| `make` / `make all` | Start stack (build + up), then open browser. No-op if already running.                   |
| `make up_build`     | Build images and start containers. No-op if already running.                             |
| `make up`           | Start containers only (no build). No-op if already running.                              |
| `make build`        | Build Docker images only.                                                                |
| `make rebuild`      | Force rebuild and start (`docker compose up -d --build`).                                |
| `make re`           | Rebuild stack and open browser.                                                          |
| `make debug`        | Build and start in foreground (logs in terminal).                                        |
| `make down`         | Stop and remove containers and network. Keeps images and volumes.                        |
| `make stop`         | Stop containers (no remove). Use `make up` to start again.                               |
| `make clean`        | Down + remove locally built images. Keeps volumes (data).                                |
| `make fclean`       | Down + remove local images + remove volumes (full reset, data lost).                     |
| `make nuke`         | Remove DB files, dev TLS certs, then `docker system prune -a -f --volumes`. Destructive. |
| `make logs`         | Follow Docker Compose logs.                                                              |
| `make ps`           | List running containers.                                                                 |
| `make open-browser` | Open https://localhost:8443 in the default browser.                                           |
| `make download`     | Pull required base images from AWS Public ECR.                                           |

### Run in development mode (optional)

If you have **Node.js** and **pnpm** installed, you can run services locally for development (see root `package.json` scripts: `pnpm dev`, `pnpm start:dev-gateway`, etc.).

### Access

- **Web app**: `https://localhost:8443/`
- **API (via gateway)**: `https://localhost:8443/api/*`
- **WebSockets (via gateway)**:
  - Comms: `wss://localhost:8443/api/comms/ws`
  - Game: `wss://localhost:8443/api/game/ws`
- **Docs (Swagger)**: `https://localhost:8443/docs` (Basic Auth via `DOCS_USER` / `DOCS_PASS`)
- **Healthcheck**: `https://localhost:8443/health` (served by `nginx`)

### Troubleshooting

- **See logs**:

```bash
docker compose logs
docker compose logs -f {service name}
```

- **Redis CLI**:

```bash
docker exec -it ft_transcendence_redis redis-cli
```

---

## Team Information

| 42 login   | Name        | Role(s)         | Responsibilities                                          |
|------------|-------------|-----------------|-----------------------------------------------------------|
| mehernan | Meritxell | Product Owner   | < product vision, backlog, validation, stakeholder comms> |
| jocuni-p | Joan      | Product Manager | < planning, tracking, removing blockers, facilitation>    |
| mvisca-g | Martin    | Tech Lead       | < architecture, key decisions, code quality, reviews>     |
| dkurcbar | Diego     | Developer       | < features implemented, ownership areas>                  |

---

## Project Management

**How we organized the work**:
At the beginning of the project, the team worked in person on campus, where we collaboratively defined the initial architecture, shared ideas, and distributed responsibilities. Tasks were initially assigned according to the previous experience we had and what each person wanted most to do.

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
DB file: `docker/anonymous/volume/path` (path is configured via `USER_SERVICE_DB_*`).
```text
                        +----------------------+
                         |        users         |
                         +----------------------+
                         | id (PK)              |
                         | username             |
                         | email                |
                         | password_hash        |
                         | avatar               |
                         | is_online            |
                         | is_deleted           |
                         | has_2fa_enabled      |
                         | totp_secret          |
                         | backup_code_hash     |
                         | last_logout_at       |
                         | created_at           |
                         | updated_at           |
                         +----------+-----------+
                                    |
        ----------------------------+----------------------------
        |                           |                           |
       hash                user_id friends_id          player1_id player2_id
        |                           |                           |
+----------------------+   +----------------------+   +----------------------+
|    refresh_tokens    |   |     friendships      |   |        matches       |
+----------------------+   +----------------------+   +----------------------+
| id (PK)              |   | user_id (FK) --------+   | id (PK)              |
| user_id (FK) --------+---| friend_id (FK) ------+   | status               |
| token_hash           |   | initiator_id         |   | player1_id (FK) -----+
| expires_at           |   | status               |   | player1_username     |
| is_2fa_verified      |   | created_at           |   | player1_avatar       |
| created_at           |   | updated_at           |   | player1_score        |
+----------------------+   +----------+-----------+   | player2_id (FK) -----+
                                                      | player2_username     |
                                                      | player2_avatar       |
                                                      | player2_score        |
                                                      | winner_id            |
                                                      | game_mode            |
                                                      | target_score         |
                                                      | created_at           |
                                                      | finished_at          |
                                                      +----------------------+
```
DB file: `packages/game/db/<game.db>` (path is configured via       `GAME_SERVICE_DB_*`).                                   
                            
        +--------------------+
        |      matches       |
        +--------------------+
        | id (PK)            |
        | status             |
        | player1_id (FK)    |
        | player1_username   |
        | player1_avatar     |
        | player1_score      |
        | player2_id (FK)    |
        | player2_username   |
        | player2_avatar     |
        | player2_score      |
        | winner_id          |
        | game_mode          |
        | target_score       |
        | created_at         |
        | finished_at        |
        +--------------------+

### User service (SQLite)

DB file: `docker/anonymous/volume/path` (path is configured via `USER_SERVICE_DB_*`).

### Game service (SQLite)

DB file: `packages/game/db/<game.db>` (path is configured via `GAME_SERVICE_DB_*`).


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
| WEB              | Framework (f/b)               | Major |  2  | All                         |
| WEB              | Realtime WS                   | Major |  2  | jocuni-p, mvisca-g, dkurcbar |
| WEB              | WebSocket Game                | Major |  2  | jocuni-p                    |
| WEB              | Notification System           | Minor |  1  | jocuni-p mvisca-g           |
| WEB              | Custom-made design system | Minor |  1  | mehernan mvisca-g               |
| ACCESSIBILITY    | Support for Additionl Browsers | Minor | 1 | mehernan jocuni-p |
| USER MANAGEMENTS | Standard User management  | Major |  2  | all                         |
| USER MANAGEMENTS | 2FA                       | Minor |  1  | mvisca-g                    |
| AI               | AI Opponent               | Major |  2  | jocuni-p                    |
| GAMING           | Complete Web Based Game   | Major |  2  | jocuni-p                    |
| GAMING           | Remote players            | Major |  2  | jocuni-p                    |
| GAMING           | Customisation options     | Minor |  1  | jocuni-p                    |
| DEVOPS           | Backend as microservices  | Major |  2  | All                         |
| MODULE OF CHOICE | Centralized UI for OpenAPI Documentation  | Minior |  1  | dkurcbar |                         |
| MODULE OF CHOICE | Gateway & Secured Internal API Rest | Minor | 1 | dkurcbar jocuni-p mvisca-g |
| MODULE OF CHOICE | Shared Contract Library (TBsch) | Minor | 1 | mvisca-g jocuni-p |

**Total points**:  24

Justification and implementation

IV.1 WEB — Framework (frontend + backend)

Why we chose it: We chose to use dedicated frameworks for both frontend and backend to ensure a structured, maintainable, and scalable codebase. A clear framework enforces architectural conventions, reduces boilerplate, and makes the system easier to reason about as it grows across multiple pages and services.
How it was implemented: The frontend was built as a React 19 SPA using Vite, organized into reusable components and pages, with React Router for navigation and Zustand for global state management (auth, friends). The backend services are built with Fastify v5, which provides a fast, schema-first HTTP layer with plugin-based extensibility.
Who implemented it: All


IV.1 WEB — Real-time features (WebSockets)

Why we chose it: The project requires persistent, bidirectional communication between server and clients for social features (friend online status, friend requests, match invitations, chat) that must update in real time without polling. WebSockets are the natural fit for this class of problem.
How it was implemented: We implemented a dedicated communications service (comms) built on @fastify/websocket. It maintains a Map<userId, Set<WebSocket>> to support multiple concurrent sessions per user. Inter-service events are broadcast via Redis pub/sub (TRANSCENDENCE_CHANNEL), and the comms service translates Redis events into targeted WebSocket messages to the relevant connected clients.
Who implemented it: jocuni-p, mvisca-g, dkurcbar


IV.1 WEB — WebSocket Game (real-time game)

Why we chose it: A real-time multiplayer game requires frame-level synchronization between players with minimal latency. HTTP request/response is unsuitable for this; WebSockets allow the game server to push state updates continuously and receive player inputs without the overhead of repeated connections.
How it was implemented: The game service exposes a dedicated WebSocket endpoint. Each match maintains an authoritative server-side game loop that computes physics, collisions, and scoring. Players send paddle movement events; the server broadcasts the canonical game state (GAME_UPDATE) to all participants on every tick, ensuring both clients render the same state.
Who implemented it: jocuni-p


IV.1 WEB — Notification system

Why we chose it: Users need to be informed of relevant events (friend requests, match invitations, match results) without having to refresh or navigate. A centralized notification system makes the application feel responsive and keeps users engaged without requiring polling.
How it was implemented: Notifications are delivered through the WebSocket connection established by the comms service. The frontend displays persistent action toasts (using senderId as toast ID to deduplicate) for events requiring user interaction (e.g. accepting/declining a friend request), and transient toasts for informational events. Dismissal is synchronized across handlers to avoid double-processing.
Who implemented it: jocuni-p, mvisca-g


IV.1 WEB — Custom-made design system

Why we chose it: A consistent visual language across all pages was necessary to deliver a coherent user experience. Defining reusable components also accelerated development: once a component is built and styled, any team member can use it without re-implementing styling decisions.
How it was implemented: We built a library of reusable UI components (NeonButton, ArcadeButton, FormCard, FormInput, PasswordInput, AvatarDisplay, AvatarUploader, PageContainer, AlertError, AlertSuccess, LoadingScreen, LinkButton) using Tailwind CSS utility classes, all exported from a central src/shared/components/ui/index.ts. The system follows a consistent arcade/retro aesthetic with a defined color palette, typography, and spacing.
Who implemented it: mehernan, mvisca-g


IV.2 ACCESSIBILITY — Support for additional browsers

Why we chose it: Limiting compatibility to a single browser reduces the reach of the application and introduces invisible bugs for users on different platforms. Cross-browser testing ensures the application works correctly for all users regardless of their environment.
How it was implemented: The application was tested and validated on at least two additional browsers beyond Chrome (Firefox and Safari/Edge). Browser-specific behaviors — particularly around WebSocket handling, canvas rendering, and CSS — were identified and resolved. Known limitations are documented.
Who implemented it: mehernan, jocuni-p


IV.3 USER MANAGEMENT — Standard user management

Why we chose it: User management is the foundation of the platform. Without authentication and profile management, no personalized feature — matches, friends, statistics — can exist. This module establishes the identity layer that all other modules build on.
How it was implemented: Users can register with email and password (hashed with bcrypt), log in with JWT-based authentication, update their profile (username, avatar), and upload a custom avatar stored via Cloudinary with a default fallback. Users can add/remove friends and see their online status in real time. Each user has a dedicated profile page displaying their information.
Who implemented it: mvisca-g, mehernan, dkurcbar


IV.3 USER MANAGEMENT — Two-Factor Authentication (2FA)

Why we chose it: Passwords alone are insufficient for account security in a modern application. 2FA adds a second layer that protects accounts even if credentials are compromised. Implementing it exposed us to real-world authentication patterns like TOTP and recovery flows.
How it was implemented: We implemented TOTP-based 2FA using a per-user secret. The login flow detects whether 2FA is enabled and, if so, requires a valid TOTP code before issuing the access token (via a short-lived provisional token). Setup, verification, and disabling are handled through dedicated endpoints. Backup codes are generated at setup and can be used to recover access and disable 2FA.
Who implemented it: mvisca-g


IV.4 ARTIFICIAL INTELLIGENCE — AI Opponent

Why we chose it: An AI opponent ensures the game is always playable, even without a second human player. It improves solo user experience and reduces dependency on matchmaking. It also allowed us to explore game AI logic — balancing challenge with playability.
How it was implemented: We created a standalone bot service that connects to a match via WebSocket using a self-signed JWT, playing as a regular participant from the game server's perspective. The bot reads the live game state (GAME_UPDATE) and computes paddle movement using configurable difficulty parameters: botSpeed (movement per frame), errorMargin (positional deviation to simulate imprecision), and reactionRate (how many ticks between target recalculations). Three difficulty levels are available: classic, speed, and pro.
Who implemented it: jocuni-p


IV.6 GAMING — Complete web-based game

Why we chose it: A real-time multiplayer game is the core of the project. Pong was chosen as a well-understood game with clear rules and win conditions, allowing us to focus on the technical challenges of real-time synchronization rather than complex game logic.
How it was implemented: The game is rendered on an HTML5 Canvas in the frontend. The backend game service runs the authoritative game loop (physics, collisions, scoring) and broadcasts state to all clients via WebSocket. The game supports 1v1 matches, local play, and matches against the bot. Win/loss conditions and match results are persisted in the database.
Who implemented it: jocuni-p


IV.6 GAMING — Remote players

Why we chose it: Allowing two players on separate machines to play in real time is the defining feature of an online multiplayer platform. This module is what transforms a local game into a social, competitive experience.
How it was implemented: Two players connect to the same match room on the game service via WebSocket. The server maintains the authoritative state and broadcasts it to both clients on every tick. Network disconnections are handled gracefully: if a player disconnects, the opponent is notified via GAME_OPPONENT_DISCONNECTED and given a configurable wait window before a forfeit is recorded.
Who implemented it: jocuni-p


IV.6 GAMING — Customisation options

Why we chose it: Customization improves user engagement by giving players agency over their experience. Offering different game modes also adds replayability and allows the game to cater to different skill levels.
How it was implemented: The game supports three distinct modes — classic, speed, and pro — each with different physics parameters and AI difficulty settings. Users can select the mode before a match begins. Default options are always available to ensure the game is immediately playable without configuration.
Who implemented it: jocuni-p


IV.7 DEVOPS — Backend as microservices

Why we chose it: A microservices architecture separates concerns into independently deployable units, improving fault isolation, scalability, and maintainability. It also reflects production-grade practices and allowed the team to work on different services in parallel without constant conflicts.
How it was implemented: The backend is split into six independent services — auth, user, game, comms, images, and bot — each in its own Docker container with its own database schema, configuration, and responsibilities. A dedicated gateway service routes all external traffic. Services communicate internally via HTTP (inter-service calls) and Redis pub/sub (async events). The entire stack is orchestrated with Docker Compose and starts with a single command.
Who implemented it: All


MODULE OF CHOICE — Centralized UI for OpenAPI Documentation

Why we chose it: With six backend services each exposing their own API, documentation becomes fragmented and hard to navigate. A centralized documentation interface is essential for development, debugging, and evaluation — it provides a single place to explore and test all endpoints across the entire system.
How it was implemented: Each service (auth, user, game, images) exposes its own OpenAPI JSON via @fastify/swagger. The gateway aggregates these at /docs, serving a unified Swagger UI with a custom dark theme that allows switching between service documentation. The gateway rewrites the server URLs in each JSON spec so that "Try it out" calls go through the gateway rather than directly to internal services, reflecting the real request flow.
Who implemented it: dkurcbar


MODULE OF CHOICE — Gateway & Secured Internal API

Why we chose it: In a microservices architecture, having each service directly exposed creates security, routing, and observability problems. A gateway provides a single controlled entry point, enforces authentication before requests reach any service, and enables cross-cutting concerns (logging, rate limiting, request tracing) to be applied uniformly.
How it was implemented: A dedicated gateway service acts as the sole external entry point. It validates JWT tokens on all protected routes before proxying to upstream services. Internal service-to-service communication uses a separate internal route prefix (not exposed externally), protected by a shared internal secret. The gateway also handles rate limiting via Redis and attaches request IDs for distributed tracing across service logs.
Who implemented it: dkurcbar, jocuni-p, mvisca-g


MODULE OF CHOICE — Shared Contract Library (@transcendence/shared)

Why we chose it: In a distributed system with six independent services and a frontend, the biggest consistency risk is divergence — services using different names for the same events, different validation rules for the same fields, or different error shapes. We solved this at the architectural level with a dedicated shared package that acts as the single source of truth for all cross-service contracts.
How it was implemented: @transcendence/shared is a compiled TypeScript package (with generated .d.ts declarations) consumed by all services and the frontend. It provides: typed event constants for Redis pub/sub and WebSocket (TRANSCENDENCE_EVENTS, WEBSOCKET_EVENTS); TypeBox schemas for all domain entities used for both runtime validation and static type inference; a centralized environment configuration system with typed accessors; a unified error class hierarchy (AppError and subtypes) ensuring consistent error response shapes; shared utilities (Redis client factory, RedisCache, UUID generators per entity, pino logger, normalizers); and a prebuild script that auto-generates JSON schemas from TypeBox definitions. Frontend imports use explicit subpath exports to avoid bundling Node.js modules.
Who implemented it: mvisca-g, jocuni-p

---


Individual Contributions
jocuni-p / Joan

    Role: Product Manager
    Modules delivered: Framework (f/b), Realtime WS, WebSocket Game, Notification System, Support for Additional Browsers, Standard User Management, AI Opponent, Complete Web-Based Game, Remote Players, Customisation Options, Backend as Microservices, Gateway & Secured Internal API, Shared Contract Library
    Notable challenges & solutions: The most significant technical challenge was adapting all backend services to structured logging with Pino. Each service needed a consistent logger instance with child loggers carrying contextual metadata (service name, request ID, match ID) without coupling services to a specific logger setup. The solution was centralizing the logger factory in @transcendence/shared so every service consumes the same configuration while retaining per-service context.

mehernan / Meritxell

    Role: Product Owner
    Modules delivered: Framework (f/b), Custom-made Design System, Support for Additional Browsers, Standard User Management, Backend as Microservices
    Notable challenges & solutions: The most challenging part was integrating the frontend with the backend. At that stage of the project, I was not familiar with how frontend-backend communication works in a multi-service architecture — particularly around JWT authentication, token propagation in request headers, and handling asynchronous API responses correctly. Working through those flows deepened my understanding of how the auth layer intersects with every feature.

dkurcbar / Diego

    Role: Developer
    Modules delivered: Framework (f/b), Realtime WS, Standard User Management, Backend as Microservices, Centralized UI for OpenAPI Documentation, Gateway & Secured Internal API
    Notable challenges & solutions: When deploying on 42's machines, we encountered two critical environment-specific issues. First, ports 443 and 80 are not available on 42's network — we had to adjust the nginx and Docker Compose configuration to use allowed ports. Second, the UUID generation for user IDs produced values exceeding the maximum integer allowed by 42's SQLite configuration — we resolved this by switching to a string-based UUID strategy consistent across all services.

mvisca-g / Martin

    Role: Tech Lead
    Modules delivered: Framework (f/b), Realtime WS, Notification System, Custom-made Design System, Standard User Management, 2FA, AI Opponent, Backend as Microservices, Gateway & Secured Internal API, Shared Contract Library
    Notable challenges & solutions: The hardest debugging session involved a query parameter (wsRawUrl) that was captured correctly in the gateway's onRequest hook but was lost by the time the WebSocket handler ran. After four different approaches, the root cause turned out to be that @fastify/websocket v11 instantiates a separate request object for the WS handler, so properties set in hooks don't persist into it. The fix was registering app.decorateRequest('wsRawUrl', '') to declare the property on the Fastify request prototype first, then assigning it in onRequest — making it available throughout the full request lifecycle including the WebSocket handler.


---

## Resources && AI
Throughout the project, we used AI tools as a support for learning and problem-solving, rather than as a replacement for our own understanding.

AI was mainly used as an interactive learning resource. It allowed us to ask direct and specific questions when facing new concepts, which helped us quickly understand unfamiliar technologies such as frontend frameworks, state management, WebSockets, and Docker-based architectures. This was especially useful when working with tools or languages that we never used before and were new to all of us.

Throughout the project, we used AI tools as a support for learning and problem-solving, rather than as a replacement for our own understanding.

AI was mainly used as an interactive learning resource. It allowed us to ask direct and specific questions when facing new concepts, which helped us quickly understand unfamiliar technologies such as frontend frameworks, state management, WebSockets, and Docker-based architectures. This was especially useful when working with tools or languages that were new to some members of the team.

Alongside AI, we relied on peer support and external learning resources. We occasionally received help from other students, especially when discussing concepts or debugging complex issues. We used YouTube tutorials and online documentation to reinforce our understanding and learn best practices.

### References (link to projects notes)

- https://glaze-weather-506.notion.site/TRANSCENDENCE-2c2d7ac27c868021bca2e1aa313f8d20

--

## Limitations
- There is a mistake in the user experience. There is a technical debt; an upgrade is needed for the connection management. When in an online game, the opponent disconnects, the waiting player waits 15 seconds, but if it disconnects and reconnects, the player starts playing vs the disconnected opponent. The game loses the pause state and stays playing.

- One thing that was left out but would have improved the user experience: connection and disconnection notifications could be displayed as a widget below the friends list.