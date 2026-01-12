# AUDITORÍA DEL SERVICIO DE GAME

**Fecha**: 2026-01-12
**Autor**: Claude
**Alcance**: Arquitectura, flujo de partidas públicas, validaciones y sistema de notificaciones

---

## 1. RESUMEN EJECUTIVO

### ✅ Fortalezas
- **Arquitectura limpia**: Separación clara de responsabilidades (Controller → Service → Repository)
- **Inyección de dependencias**: Facilita testing y mantenibilidad
- **Tipado fuerte**: TypeScript bien utilizado con tipos compartidos
- **Eventos desacoplados**: Uso de Redis Pub/Sub para notificaciones
- **WebSocket dedicado**: Conexión de baja latencia para juego en tiempo real

### ⚠️ Problemas Críticos Detectados
1. **[CRÍTICO]** No se valida que el usuario esté en otra partida activa antes de unirse a la cola pública
2. **[CRÍTICO]** Servicio de notificaciones no implementado (eventos Redis sin consumidor)
3. **[MEDIO]** Inputs del cliente no procesados (socket.on('message') no conectado)
4. **[BAJO]** Reconexión no soportada (desconexión = abandono)

---

## 2. ARQUITECTURA ACTUAL

### 2.1 Estructura de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENTE                              │
│  ┌──────────────┐              ┌─────────────────────┐      │
│  │  HTTP REST   │              │  WebSocket Game     │      │
│  └──────┬───────┘              └──────────┬──────────┘      │
└─────────┼────────────────────────────────┼─────────────────┘
          │                                 │
          │                                 │
┌─────────▼────────────────────────────────▼─────────────────┐
│                    GAME SERVICE                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  MatchController (REST Endpoints)                    │  │
│  │  - POST /api/matches                                 │  │
│  │  - POST /api/matches/:id/accept                      │  │
│  │  - POST /api/matches/:id/reject                      │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                     │
│  ┌────────────────────▼────────────────────────────────┐   │
│  │  MatchService (Lógica de Negocio)                   │   │
│  │  - joinPublicQueue()    → Matchmaking FIFO          │   │
│  │  - createPrivateMatch() → Desafío directo           │   │
│  │  - acceptMatch()        → Confirma partida          │   │
│  │  - rejectMatch()        → Rechaza partida           │   │
│  └────────┬────────────────────────────────────────────┘   │
│           │                                                 │
│  ┌────────▼────────────────────────────────────────────┐   │
│  │  MatchRepository (Persistencia)                     │   │
│  │  - createPublicMatch()  → INSERT active             │   │
│  │  - createPrivateMatch() → INSERT pending            │   │
│  │  - updateStatus()       → UPDATE status             │   │
│  │  - findById()           → SELECT                    │   │
│  │  - finishMatch()        → UPDATE winner             │   │
│  └────────┬────────────────────────────────────────────┘   │
│           │                                                 │
│           ▼                                                 │
│     ┌─────────┐                                             │
│     │ SQLite  │                                             │
│     └─────────┘                                             │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  GameGateway (WebSocket Handler)                     │  │
│  │  - handleConnection() → Valida JWT                   │  │
│  │  - Eventos: message, close                           │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                     │
│  ┌────────────────────▼────────────────────────────────┐   │
│  │  GameService (Motor de Juego)                       │   │
│  │  - joinMatch()      → Asigna socket a sesión        │   │
│  │  - startGameLoop()  → Loop 60 FPS                   │   │
│  │  - updatePhysics()  → Calcula colisiones/puntos     │   │
│  │  - processInput()   → Mueve paletas                 │   │
│  │  - endGame()        → Guarda resultado              │   │
│  └────────┬────────────────────────────────────────────┘   │
│           │                                                 │
│           ▼                                                 │
│  ┌────────────────────┐                                    │
│  │ Map<matchId,       │                                    │
│  │  GameSession>      │  (Sesiones en memoria)             │
│  └────────────────────┘                                    │
└─────────────────────────────────────────────────────────────┘
          │
          │ Redis Pub/Sub
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    REDIS (Canal: game_events)                │
│  Eventos publicados:                                         │
│  - match.found    → Matchmaking exitoso                      │
│  - match.invite   → Invitación privada                       │
│  - match.started  → Partida aceptada                         │
│  - match.rejected → Partida rechazada                        │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
     [NO IMPLEMENTADO]
    Notification Service
```

### 2.2 Tecnologías Utilizadas

| Componente | Tecnología | Justificación |
|------------|------------|---------------|
| Framework HTTP | Fastify | Alto rendimiento, plugins nativos |
| WebSocket | ws (library) | Estándar, ligera, compatible |
| Base de Datos | SQLite (better-sqlite3) | Síncrono, rápido, sin red |
| Cache/Queue | Redis | Matchmaking volátil, Pub/Sub |
| Validación | JWT | Autenticación stateless |
| Tipado | TypeScript | Seguridad de tipos en compilación |

---

## 3. FLUJO DE PARTIDAS PÚBLICAS (DETALLADO)

### 3.1 Flujo Completo: Matchmaking Público

```
┌─────────────────────────────────────────────────────────────┐
│ FASE 1: USUARIO A SE UNE A LA COLA (PRIMERA PETICIÓN)      │
└─────────────────────────────────────────────────────────────┘

1. Cliente A → POST /api/matches
   Headers: Authorization: Bearer <jwt-user-a>
   Body: { matchType: 'public' }

2. Middleware → validateJWT()
   ✓ Token válido → request.user = { id: 'user-a-uuid', username: 'PlayerA' }

3. MatchController.createMatch()
   → Detecta matchType === 'public'
   → Llama MatchService.joinPublicQueue('user-a-uuid')

4. MatchService.joinPublicQueue('user-a-uuid')
   ┌──────────────────────────────────────────────────────┐
   │ const opponentId = await redisClient.lpop('match:queue:public');
   │ // Redis devuelve: null (cola vacía)
   │
   │ if (opponentId && opponentId !== userId) {
   │    // NO SE EJECUTA (no hay oponente)
   │ } else {
   │    // SE EJECUTA ESTE BLOQUE ✓
   │    await redisClient.rpush('match:queue:public', 'user-a-uuid');
   │    return { outcome: 'added_to_queue' };
   │ }
   └──────────────────────────────────────────────────────┘

5. Controller responde: 200 OK
   Body: { outcome: 'added_to_queue' }

6. Estado Redis:
   match:queue:public = ['user-a-uuid']


┌─────────────────────────────────────────────────────────────┐
│ FASE 2: USUARIO B SE UNE Y ENCUENTRA A USUARIO A           │
└─────────────────────────────────────────────────────────────┘

7. Cliente B → POST /api/matches
   Headers: Authorization: Bearer <jwt-user-b>
   Body: { matchType: 'public' }

8. MatchService.joinPublicQueue('user-b-uuid')
   ┌──────────────────────────────────────────────────────┐
   │ const opponentId = await redisClient.lpop('match:queue:public');
   │ // Redis devuelve: 'user-a-uuid' ✓
   │
   │ if (opponentId && opponentId !== userId) {
   │    // SE EJECUTA ✓ ('user-a-uuid' !== 'user-b-uuid')
   │
   │    // a. Crear partida en DB (status: 'active')
   │    const matchRow = await this.matchRepo.createPublicMatch(
   │        opponentId,  // Player 1: user-a (estaba esperando)
   │        userId       // Player 2: user-b (trigger del match)
   │    );
   │    // matchRow = {
   │    //   id: '<uuid-generado>',
   │    //   status: 'active',
   │    //   player1_id: 'user-a-uuid',
   │    //   player2_id: 'user-b-uuid',
   │    //   player1_score: 0,
   │    //   player2_score: 0,
   │    //   created_at: <timestamp>
   │    // }
   │
   │    // b. Mapear a objeto de dominio
   │    let matchDomain = MatchMapper.toDomain(matchRow);
   │
   │    // c. Hidratar usernames (S2S call a User Service)
   │    matchDomain = await this.hydrateMatchPlayers(matchDomain);
   │    // matchDomain.player1.username = 'PlayerA'
   │    // matchDomain.player2.username = 'PlayerB'
   │
   │    // d. Publicar evento en Redis
   │    await redisClient.publish('game_events', JSON.stringify({
   │        type: 'match.found',
   │        payload: {
   │            matchId: matchDomain.id,
   │            opponentId: 'user-b-uuid',
   │            match: matchDomain
   │        }
   │    }));
   │
   │    // e. Retornar
   │    return { outcome: 'match_found', match: matchDomain };
   │ }
   └──────────────────────────────────────────────────────┘

9. Controller responde: 201 Created
   Body: {
     outcome: 'match_found',
     match: {
       id: '<uuid>',
       status: 'active',
       player1: { userId: 'user-a-uuid', username: 'PlayerA', score: 0 },
       player2: { userId: 'user-b-uuid', username: 'PlayerB', score: 0 },
       createdAt: '2026-01-12T10:30:00Z'
     }
   }

10. Estado Redis:
    match:queue:public = [] (vacía)
    Canal game_events: Evento 'match.found' publicado


┌─────────────────────────────────────────────────────────────┐
│ FASE 3: CONEXIÓN AL JUEGO VÍA WEBSOCKET                    │
└─────────────────────────────────────────────────────────────┘

11. Cliente A → WebSocket Connection
    URL: ws://host/api/game/ws?token=<jwt-user-a>&matchId=<uuid>

12. GameGateway.handleConnection()
    ┌──────────────────────────────────────────────────────┐
    │ // Extraer query params
    │ const { matchId, token } = req.query;
    │
    │ // Validar JWT manualmente
    │ const payload = jwt.verify(token, JWT_SECRET);
    │ // payload = { id: 'user-a-uuid', username: 'PlayerA' }
    │
    │ // Unirse a la partida
    │ await this.gameService.joinMatch(matchId, 'user-a-uuid', socket);
    └──────────────────────────────────────────────────────┘

13. GameService.joinMatch(matchId, 'user-a-uuid', socket)
    ┌──────────────────────────────────────────────────────┐
    │ // Buscar sesión en memoria
    │ let session = this.activeMatches.get(matchId);
    │
    │ if (!session) {
    │    // No existe → Hidratar desde DB
    │    const matchFromDb = await this.matchRepo.findById(matchId);
    │
    │    session = {
    │        matchId: matchId,
    │        player1Id: 'user-a-uuid',
    │        player2Id: 'user-b-uuid',
    │        socketP1: null,
    │        socketP2: null,
    │        gameState: this.createInitialState(matchId),
    │        loopId: null
    │    };
    │    this.activeMatches.set(matchId, session);
    │ }
    │
    │ // Asignar socket
    │ if (session.player1Id === 'user-a-uuid') {
    │    session.socketP1 = socket; ✓
    │ }
    │
    │ // Comprobar si ambos están conectados
    │ if (session.socketP1 && session.socketP2) {
    │    // NO SE EJECUTA AÚN (falta user-b)
    │ }
    └──────────────────────────────────────────────────────┘

14. Cliente A recibe: { event: 'JOINED_MATCH', data: { status: 'pending', message: 'Esperando oponente...' } }

15. Cliente B → WebSocket Connection
    URL: ws://host/api/game/ws?token=<jwt-user-b>&matchId=<uuid>

16. GameService.joinMatch(matchId, 'user-b-uuid', socket)
    ┌──────────────────────────────────────────────────────┐
    │ // Sesión YA existe en memoria
    │ let session = this.activeMatches.get(matchId); ✓
    │
    │ // Asignar socket
    │ if (session.player2Id === 'user-b-uuid') {
    │    session.socketP2 = socket; ✓
    │ }
    │
    │ // Comprobar si ambos están conectados
    │ if (session.socketP1 && session.socketP2) {
    │    // SE EJECUTA ✓
    │    this.startGameLoop(matchId);
    │ }
    └──────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│ FASE 4: JUEGO EN TIEMPO REAL (GAME LOOP)                   │
└─────────────────────────────────────────────────────────────┘

17. GameService.startGameLoop(matchId)
    ┌──────────────────────────────────────────────────────┐
    │ session.gameState.status = 'PLAYING';
    │
    │ session.loopId = setInterval(() => {
    │    this.updatePhysics(session);
    │    this.broadcastState(session);
    │ }, 1000 / 60);  // 60 FPS ≈ 16.6ms
    └──────────────────────────────────────────────────────┘

18. updatePhysics(session)
    - Mueve la bola
    - Detecta colisiones con paredes
    - Detecta colisiones con paletas
    - Actualiza puntuación si hay gol
    - Si algún jugador llega a 6 puntos → endGame()

19. broadcastState(session)
    - Envía estado actual a ambos sockets:
      {
        event: 'GAME_UPDATE',
        data: {
          player1: { x, y, score },
          player2: { x, y, score },
          ball: { x, y, dx, dy }
        }
      }

20. Cuando alguien gana (score >= 6):
    ┌──────────────────────────────────────────────────────┐
    │ this.endGame(matchId, winnerId);
    │
    │ // a. Detener loop
    │ clearInterval(session.loopId);
    │
    │ // b. Guardar resultado en DB
    │ await this.matchRepo.finishMatch(matchId, winnerId, p1Score, p2Score, Date.now());
    │
    │ // c. Notificar clientes
    │ socket.send(JSON.stringify({
    │    event: 'GAME_OVER',
    │    data: { winnerId, reason: 'SCORE_LIMIT_REACHED' }
    │ }));
    │
    │ // d. Limpiar memoria
    │ this.activeMatches.delete(matchId);
    └──────────────────────────────────────────────────────┘
```

### 3.2 Diagrama de Estados de una Partida

```
┌─────────────┐
│   PENDING   │  ← Solo partidas PRIVADAS
└──────┬──────┘
       │
       │ accept()
       ▼
┌─────────────┐
│   ACTIVE    │  ← Partidas PÚBLICAS empiezan aquí
└──────┬──────┘
       │
       │ Ambos conectados + Game Loop
       ▼
┌─────────────┐
│   PLAYING   │  (No persiste en DB, solo en memoria)
└──────┬──────┘
       │
       │ Score >= 6 o Desconexión
       ▼
┌─────────────┐
│  FINISHED   │  ← Estado final en DB
└─────────────┘
```

---

## 4. PROBLEMA CRÍTICO: VALIDACIÓN DE PARTIDA ACTIVA

### 4.1 Descripción del Bug

**Ubicación**: `packages/game/src/services/MatchService.ts:33-84`
**Método**: `joinPublicQueue(userId: string)`

**Problema**: No se valida si el usuario ya está en una partida activa antes de permitir que se una a la cola pública.

### 4.2 Código Actual

```typescript
async joinPublicQueue(userId: string): Promise<JoinQueueResponse> {
    const QUEUE_KEY = 'match:queue:public';

    // 1. Intentamos sacar un oponente de la cola
    const opponentId = await redisClient.lpop(QUEUE_KEY);

    // 2. Si encontramos oponente válido → Crear partida
    if (opponentId && opponentId !== userId) {
        const matchRow = await this.matchRepo.createPublicMatch(opponentId, userId);
        // ... resto del código
        return { outcome: 'match_found', match: matchDomain };
    } else {
        // 3. Si no hay oponente → Añadir a cola
        await redisClient.rpush(QUEUE_KEY, userId);
        return { outcome: 'added_to_queue' };
    }
}
```

### 4.3 Escenario de Explotación

```
1. Usuario A → POST /api/matches (matchType: 'public')
   → Se añade a la cola: ['user-a']

2. Usuario B → POST /api/matches (matchType: 'public')
   → Encuentra a user-a
   → Partida ACTIVA creada (ID: match-1)
   → Estado: user-a y user-b están en partida activa

3. Usuario A (mientras juega) → POST /api/matches (matchType: 'public')
   → NO HAY VALIDACIÓN ❌
   → Se añade OTRA VEZ a la cola: ['user-a']

4. Usuario C → POST /api/matches (matchType: 'public')
   → Encuentra a user-a (que ya está jugando)
   → Crea SEGUNDA partida (ID: match-2)
   → Estado: user-a ahora tiene 2 partidas activas simultáneas
```

### 4.4 Consecuencias

1. **Doble partida**: El usuario puede estar en múltiples partidas simultáneas
2. **Inconsistencia de estado**: El GameService solo maneja 1 sesión por usuario
3. **Abandono fantasma**: Si el usuario se conecta a match-2, abandona match-1 implícitamente
4. **Puntuación corrupta**: Pueden guardarse resultados inválidos

### 4.5 Solución Propuesta

Añadir validación en `MatchService.joinPublicQueue()`:

```typescript
async joinPublicQueue(userId: string): Promise<JoinQueueResponse> {
    // ✓ VALIDACIÓN AÑADIDA
    const activeMatch = await this.matchRepo.findActiveMatchByUserId(userId);
    if (activeMatch) {
        throw new Error('You are already in an active match');
    }

    const QUEUE_KEY = 'match:queue:public';
    const opponentId = await redisClient.lpop(QUEUE_KEY);
    // ... resto del código
}
```

**Nuevo método en Repository**:

```typescript
// packages/game/src/repositories/MatchRepository.ts
findActiveMatchByUserId(userId: string): MatchTypes.MatchRow | null {
    const stmt = this.db.prepare(`
        SELECT * FROM matches
        WHERE (player1_id = ? OR player2_id = ?)
        AND status IN ('active', 'pending')
        LIMIT 1
    `);
    const row = stmt.get(userId, userId);
    return row ? (row as MatchTypes.MatchRow) : null;
}
```

---

## 5. SISTEMA DE NOTIFICACIONES Y WEBSOCKETS

### 5.1 Estado Actual

#### Eventos Publicados en Redis (Canal: `game_events`)

| Evento | Cuándo | Payload | Consumidor |
|--------|--------|---------|------------|
| `match.found` | Matchmaking exitoso | `{ matchId, opponentId, match }` | ❌ Ninguno |
| `match.invite` | Invitación privada | `{ targetUserId, match }` | ❌ Ninguno |
| `match.started` | Partida aceptada | `{ match }` | ❌ Ninguno |
| `match.rejected` | Partida rechazada | `{ match }` | ❌ Ninguno |

**Problema**: Estos eventos se publican pero **nadie los consume**. No hay servicio de notificaciones escuchando el canal `game_events`.

#### WebSocket Actual

**Ubicación**: `packages/game/src/gateways/GameGateway.ts`
**URL**: `ws://host/api/game/ws?token=<jwt>&matchId=<uuid>`

**Características**:
- ✅ Dedicado exclusivamente al juego en tiempo real
- ✅ Validación JWT manual
- ✅ Requiere `matchId` conocido previamente
- ✅ Broadcast de estado 60 FPS
- ❌ No procesa inputs del cliente (TODO en línea 92)
- ❌ No soporta reconexión

### 5.2 Flujo Problemático Actual

```
┌─────────────────────────────────────────────────────────────┐
│ Usuario A entra en cola pública                             │
└─────────────────────────────────────────────────────────────┘
1. POST /api/matches → 200 OK { outcome: 'added_to_queue' }
2. Cliente A queda esperando... (polling? long-polling? ¿nada?)

┌─────────────────────────────────────────────────────────────┐
│ Usuario B encuentra a Usuario A                             │
└─────────────────────────────────────────────────────────────┘
3. POST /api/matches → 201 Created { outcome: 'match_found', match: {...} }
4. Evento 'match.found' publicado en Redis
5. ❌ NADIE ESCUCHA ESTE EVENTO
6. Usuario A NO ES NOTIFICADO ❌
7. Usuario B recibe matchId en la respuesta HTTP ✓
8. Usuario A nunca sabe que debe conectarse ❌
```

**Resultado**: Usuario A queda en limbo esperando, Usuario B se conecta al WebSocket pero la partida no inicia porque falta el otro jugador.

### 5.3 Evaluación de la Arquitectura Propuesta

#### Propuesta del Usuario

> "La idea es tener un event broker (servicio de notificaciones) que mantiene un WS con el cliente desde el login. Cuando se crea una partida, el usuario puede conectarse a un websocket adicional dedicado exclusivamente a la partida."

#### Análisis

**✅ ES CORRECTA Y SIGUE MEJORES PRÁCTICAS**

Esta arquitectura se llama **"Dual WebSocket Pattern"** y es estándar en aplicaciones de juegos/chat:

```
┌──────────────────────────────────────────────────────────────┐
│                         CLIENTE                              │
│                                                              │
│  ┌─────────────────────┐      ┌──────────────────────┐     │
│  │  WebSocket 1        │      │  WebSocket 2         │     │
│  │  (Notificaciones)   │      │  (Juego)             │     │
│  │                     │      │                      │     │
│  │  - Persistente      │      │  - Temporal          │     │
│  │  - Desde login      │      │  - Solo durante      │     │
│  │  - Eventos globales │      │    la partida        │     │
│  │    * match.found    │      │  - Alta frecuencia   │     │
│  │    * match.invite   │      │    (60 FPS)          │     │
│  │    * chat.message   │      │  - Estado del juego  │     │
│  │    * friend.online  │      │                      │     │
│  └─────────────────────┘      └──────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
           │                              │
           │                              │
┌──────────▼────────────────┐   ┌────────▼──────────────────┐
│   NOTIFICATION SERVICE    │   │     GAME SERVICE          │
│                           │   │                           │
│  - WS Persistente         │   │  - WS Temporal            │
│  - 1 conexión por usuario │   │  - 1 conexión por partida │
│  - Redis Subscriber       │   │  - Game Loop              │
│    * game_events          │   │  - Física                 │
│    * chat_events          │   │                           │
│    * friend_events        │   │                           │
└───────────────────────────┘   └───────────────────────────┘
```

#### Ventajas de Esta Arquitectura

1. **Separación de responsabilidades**:
   - Notification Service: Eventos de bajo tráfico, persistente
   - Game Service: Eventos de alto tráfico (60 FPS), temporal

2. **Escalabilidad**:
   - Notification Service puede manejar millones de conexiones idle
   - Game Service solo maneja jugadores activos en partida

3. **Resiliencia**:
   - Si el Game Service se cae, las notificaciones siguen funcionando
   - Viceversa también

4. **Simplicidad del cliente**:
   - No necesita polling para notificaciones
   - Sabe inmediatamente cuándo debe conectarse al juego

#### Flujo Correcto con Notification Service

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USUARIO A HACE LOGIN                                     │
└─────────────────────────────────────────────────────────────┘
POST /api/auth/login → 200 OK { token: <jwt> }

Cliente A conecta WebSocket 1 (Notificaciones):
ws://notification-service/ws?token=<jwt>

Notification Service:
- Almacena: Map<userId, socket>
- Suscribe a Redis canal 'game_events'


┌─────────────────────────────────────────────────────────────┐
│ 2. USUARIO A ENTRA EN COLA PÚBLICA                          │
└─────────────────────────────────────────────────────────────┘
POST /api/matches → 200 OK { outcome: 'added_to_queue' }

Cliente A: Muestra "Buscando oponente..." en UI


┌─────────────────────────────────────────────────────────────┐
│ 3. USUARIO B HACE LOGIN Y ENCUENTRA A A                     │
└─────────────────────────────────────────────────────────────┘
POST /api/matches → 201 Created { outcome: 'match_found', match: {...} }

Game Service publica en Redis:
{
  type: 'match.found',
  payload: {
    matchId: '<uuid>',
    opponentId: 'user-b-uuid',
    match: { ... }
  }
}

Notification Service (escuchando Redis):
1. Recibe evento 'match.found'
2. Extrae userId del evento (user-a-uuid)
3. Busca socket de user-a en Map
4. Envía notificación:
   {
     type: 'match.found',
     data: {
       matchId: '<uuid>',
       opponent: { username: 'PlayerB' }
     }
   }

Cliente A recibe notificación:
→ Redirige a pantalla de juego
→ Conecta WebSocket 2 (Juego):
  ws://game-service/api/game/ws?token=<jwt>&matchId=<uuid>


┌─────────────────────────────────────────────────────────────┐
│ 4. AMBOS EN JUEGO                                           │
└─────────────────────────────────────────────────────────────┘
WebSocket 1 (Notificaciones): Sigue abierto en background
WebSocket 2 (Juego): Recibe estados 60 FPS

Cuando termina la partida:
- WebSocket 2 se cierra
- Cliente vuelve al menú principal
- WebSocket 1 sigue activo para nuevas notificaciones
```

---

## 6. RECOMENDACIONES Y PRÓXIMOS PASOS

### 6.1 Prioridad CRÍTICA

#### 1. Implementar validación de partida activa
**Archivo**: `packages/game/src/services/MatchService.ts`
**Cambios**:
- Añadir método `findActiveMatchByUserId()` en `MatchRepository`
- Validar en `joinPublicQueue()` antes de añadir a cola
- Validar también en `createPrivateMatch()` (evitar desafíos mientras se juega)

**Estimación**: 1-2 horas

#### 2. Implementar Notification Service
**Nuevos archivos**:
```
packages/notification/
├── src/
│   ├── server.ts
│   ├── NotificationGateway.ts  # WebSocket handler
│   ├── RedisSubscriber.ts      # Escucha 'game_events'
│   └── ConnectionManager.ts    # Map<userId, socket>
```

**Funcionalidad**:
- WebSocket persistente desde login: `ws://notification/ws?token=<jwt>`
- Suscribir a Redis canal `game_events`
- Enviar notificaciones en tiempo real

**Estimación**: 4-6 horas

### 6.2 Prioridad ALTA

#### 3. Conectar inputs del cliente
**Archivo**: `packages/game/src/gateways/GameGateway.ts:90`
**Cambio**:
```typescript
socket.on('message', async (message: string) => {
    // ANTES: console.log(...)
    // DESPUÉS:
    await this.gameService.processInput(matchId, userId, message);
});
```

**Estimación**: 30 minutos

#### 4. Manejo de errores en Redis
Añadir try-catch en publicaciones de eventos para evitar crashes si Redis cae.

**Estimación**: 1 hora

### 6.3 Prioridad MEDIA

#### 5. Timeout de cola pública
Si un usuario entra en cola y nadie lo encuentra en X minutos, sacarlo automáticamente.

**Implementación**:
```typescript
// Al añadir a cola:
await redisClient.rpush('match:queue:public', userId);
await redisClient.expire(`match:queue:user:${userId}`, 300); // 5 min

// Cron job que limpia cola cada minuto
```

#### 6. Reconexión automática
Permitir que un usuario se reconecte al WebSocket si se desconecta brevemente.

**Implementación**:
- No destruir sesión inmediatamente en `handleDisconnect()`
- Esperar 30 segundos antes de dar victoria por abandono
- Si reconecta en ese tiempo, reasignar socket

### 6.4 Prioridad BAJA

#### 7. Pausa de partida
Implementar botón de pausa (requiere consenso de ambos jugadores).

#### 8. Migrar de SQLite a PostgreSQL
Para producción, usar DB con soporte de concurrencia.

#### 9. Tests de integración
Añadir tests E2E que cubran el flujo completo de matchmaking.

---

## 7. CONCLUSIONES

### Arquitectura General: ✅ BIEN DISEÑADA

El servicio de game tiene una arquitectura limpia y escalable. La separación de responsabilidades es clara y el uso de TypeScript garantiza seguridad de tipos.

### Problemas Críticos: ⚠️ 2 DETECTADOS

1. **Falta validación de partida activa**: Permite múltiples partidas simultáneas por usuario
2. **Notification Service no implementado**: Los eventos Redis no se consumen

### Propuesta de Websockets: ✅ CORRECTA

La idea de tener:
- **WS 1 (Notificaciones)**: Persistente desde login
- **WS 2 (Juego)**: Temporal durante partida

Es la arquitectura estándar y recomendada para este tipo de aplicaciones.

### Próximos Pasos Sugeridos

1. ✅ Implementar validación de partida activa (CRÍTICO)
2. ✅ Desarrollar Notification Service (CRÍTICO)
3. ✅ Conectar inputs del cliente (ALTO)
4. ⏸️  Reconexión automática (MEDIO)
5. ⏸️  Migración a PostgreSQL (BAJO)

---

**Fin del Documento de Auditoría**
