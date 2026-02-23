# Paquete Game — Mapa de Eventos, Endpoints y Recursos

> Generado: 2026-02-18

---

## 1. Eventos Redis que PUBLICA

Todos los eventos se publican en el canal único `transcendence:events` (`REDIS_CHANNELS.EVENTS`) vía `redis.publish()`.

| Evento (type) | Constante | Publicado desde | Descripción |
|---|---|---|---|
| `match:found` | `REDIS_CHANNELS.MATCH_FOUND` | `MatchService.joinPublicQueue()` | Se encontró pareja en cola pública. Payload: `{ matchId, playerIds }` |
| `match.queue_timeout` | `REDIS_CHANNELS.MATCH_QUEUE_TIMEOUT` | `MatchService.pruneQueues()` | Un usuario expiró en la cola (>90s). Payload: `{ userId, reason }` |
| `match.invite` | `REDIS_CHANNELS.MATCH_INVITE` | `MatchService.createPrivateMatch()` | Invitación privada creada. Payload: `{ matchId, inviterId, inviteeId, gameMode }` |
| `match.started` | `REDIS_CHANNELS.MATCH_STARTED` | `MatchService.acceptMatch()` | Partida privada aceptada y activa. Payload: `{ matchId, playerIds }` |
| `match.rejected` | `REDIS_CHANNELS.MATCH_REJECTED` | `MatchService.rejectMatch()` | Invitación rechazada. Payload: `{ matchId, rejectorId, inviterId }` |
| `match.cancelled` | `REDIS_CHANNELS.MATCH_CANCELLED` | `MatchService.cancelPendingMatches()` / `MatchService.cancelPrivateMatch()` | Invitación cancelada (por host o por desconexión). Payload: `{ matchId, cancelledById, notifiedUserId, reason }` |

---

## 2. Eventos Redis a los que está SUSCRITO

La suscripción se gestiona en `MatchEventSubscriber`. Se suscribe al canal `transcendence:events` y filtra por `event.type`.

| Evento (type) | Constante | Handler | Acción |
|---|---|---|---|
| `user:disconnected` | `REDIS_CHANNELS.USER_DISCONNECTED` | `MatchEventSubscriber.handleMessage()` | Ejecuta en paralelo: `matchService.leavePublicQueue()`, `matchService.cancelPendingMatches()`, `gameService.handleDisconnect()` |
| `user:profile_updated` | `REDIS_CHANNELS.USER_PROFILE_UPDATED` | `MatchEventSubscriber.handleMessage()` | Sincroniza username: `matchService.handleUsernameChange()` (DB) + `gameService.updatePlayerNameInActiveMatch()` (Memoria) |

---

## 3. Endpoints HTTP

Todos los endpoints se registran bajo el prefijo `/api` (definido en `app.ts`).

| Método | Ruta completa | Auth | Descripción | Controller |
|---|---|---|---|---|
| `POST` | `/api/matches` | JWT | Crea una partida (pública/privada/local). Orquestador central. | `MatchController.createMatch()` |
| `DELETE` | `/api/matches/queue` | JWT | Saca al usuario de la cola de matchmaking público. | `MatchController.leaveQueue()` |
| `POST` | `/api/matches/:id/accept` | JWT | Acepta una invitación de partida privada. | `MatchController.acceptMatch()` |
| `POST` | `/api/matches/:id/reject` | JWT | Rechaza una invitación de partida privada. | `MatchController.rejectMatch()` |
| `DELETE` | `/api/matches/:id` | JWT | Cancela una invitación pendiente (solo el creador). | `MatchController.cancelMatch()` |
| `GET` | `/api/matches/history/:userId` | JWT | Obtiene el historial de partidas de un usuario. | `MatchController.getMatchHistory()` |
| `GET` | `/api/health` | No | Health check del servicio (verifica Redis). | `HealthController.handleHealthCheck()` |
| `GET` | `/api/game/ws` | Token en query param | WebSocket upgrade para jugar la partida en tiempo real. | `GameGateway.handleConnection()` |

---

## 4. Requests HTTP Internos (Service-to-Service)

Peticiones `fetch()` a otros microservicios usando `X-Service-Secret` o `x-service-secret` como autenticación.

| Destino | Método | Ruta | Llamado desde | Propósito |
|---|---|---|---|---|
| User Service | `GET` | `{USER_SERVICE_URL}/internal/users/by-id/{userId}` | `MatchService.fetchUserProfile()` | Obtener el `username` de un usuario para rellenar datos de la partida. |
| User Service | `GET` | `{USER_SERVICE_URL}/internal/users/{userId}/last-logout` | `GameMiddleware.fetchLastLogoutAt()` | Validar que el JWT no fue revocado (emitido antes del último logout). |
| User Service | `GET` | `{USER_SERVICE_URL}/internal/users/{userId}/last-logout` | `GameGateway.handleConnection()` | Misma validación de revocación de token durante el handshake WebSocket. |

---

## 5. Cron Jobs

Definidos en `game.routes.ts` con `setInterval`.

| Intervalo | Función | Descripción |
|---|---|---|
| **10 segundos** | `matchService.pruneQueues()` | Limpia usuarios que llevan >90s en colas públicas de matchmaking. Notifica vía Redis (`match.queue_timeout`). |
| **10 segundos** | `matchService.prunePrivateInvites()` | Marca como `expired` las invitaciones privadas pendientes >60s en DB (`MatchRepository.expirePendingMatches()`). |

> Ambos cron jobs se ejecutan en el mismo `setInterval` y se limpian con `clearInterval(cronInterval)` en el hook `onClose` de Fastify.

---

## 6. Listas / Estructuras Redis que maneja

| Clave Redis | Tipo | Usado en | Descripción |
|---|---|---|---|
| `match:queue:{gameMode}` | **Sorted Set** (`ZADD` / `ZPOPMIN` / `ZRANGEBYSCORE` / `ZREM`) | `MatchService.joinPublicQueue()`, `MatchService.leavePublicQueue()`, `MatchService.pruneQueues()` | Cola de matchmaking público. El score es el timestamp de entrada. Un Sorted Set por cada modo de juego (`classic`, `speed`, `pro`). |
| `match:local:{matchId}` | **String** (`SET` con `EX 15` / `GET` / `DEL`) | `MatchService.createLocalMatch()`, `GameService.joinMatch()` | Ticket temporal para partidas locales. TTL de 15 segundos. Se consume al conectar el WebSocket. |

---

## 7. Clientes Redis que posee

| Cliente | Creado en | Tipo | Propósito |
|---|---|---|---|
| `redisClient` (principal) | `game.routes.ts` (Composition Root) | `Utils.createRedisClient()` | Cliente general para operaciones de Pub/Sub (publish), Sorted Sets (colas), y lectura/escritura de claves. Inyectado a `MatchService` y `GameService`. |
| `subscriber` (dedicado) | `MatchEventSubscriber` (constructor) | `Utils.createRedisClient()` | Cliente exclusivo para suscripción Pub/Sub (`subscribe`). Necesario porque Redis requiere una conexión separada en modo subscriber. |

> **Total: 2 conexiones Redis** por instancia del servicio Game.

---

## Resumen Visual

```
┌─────────────────────────────────────────────────────────────────┐
│                        GAME SERVICE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Redis Clients (2)                                              │
│  ├── redisClient (pub + data ops)                               │
│  └── subscriber  (sub only)                                     │
│                                                                 │
│  Publica (6 eventos):                                           │
│  ├── match:found                                                │
│  ├── match.queue_timeout                                        │
│  ├── match.invite                                               │
│  ├── match.started                                              │
│  ├── match.rejected                                             │
│  └── match.cancelled                                            │
│                                                                 │
│  Escucha (2 eventos):                                           │
│  ├── user:disconnected                                          │
│  └── user:profile_updated                                       │
│                                                                 │
│  Endpoints (8):                                                 │
│  ├── POST   /api/matches                                        │
│  ├── DELETE  /api/matches/queue                                  │
│  ├── POST   /api/matches/:id/accept                             │
│  ├── POST   /api/matches/:id/reject                             │
│  ├── DELETE  /api/matches/:id                                    │
│  ├── GET    /api/matches/history/:userId                         │
│  ├── GET    /api/health                                          │
│  └── WS     /api/game/ws                                        │
│                                                                 │
│  HTTP Interno (2 rutas únicas → User Service):                  │
│  ├── GET /internal/users/by-id/{userId}                          │
│  └── GET /internal/users/{userId}/last-logout                    │
│                                                                 │
│  Cron Jobs (2, cada 10s):                                       │
│  ├── pruneQueues (limpia colas públicas)                         │
│  └── prunePrivateInvites (expira invitaciones)                   │
│                                                                 │
│  Redis Keys:                                                    │
│  ├── match:queue:{gameMode}  (Sorted Set)                        │
│  └── match:local:{matchId}   (String, TTL 15s)                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
