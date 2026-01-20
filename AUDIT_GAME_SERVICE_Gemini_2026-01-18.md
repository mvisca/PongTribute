# Auditoría Profunda: Game Service (Gemini 2026-01-18)

**Fecha:** 18 de Enero de 2026
**Responsable:** GitHub Copilot (Gemini 3 Pro)
**Estado del Paquete:** `packages/game`

---

## 1. Arquitectura y Diseño

### 1.1 Estructura General
El servicio sigue una arquitectura limpia y modular, utilizando el patrón **Composition Root** en `gameRoutes.ts` para la inyección de dependencias.
- **Framework**: Fastify + `@fastify/websocket`.
- **Capa de Datos**: Repository Pattern (`MatchRepository`) con `better-sqlite3`.
- **Lógica de Negocio**: `MatchService` (gestión de partidas/matchmaking) y `GameService` (bucle de juego en memoria).
- **Comunicación**: HTTP (REST) para admin/setup y WebSockets (WS) para tiempo real.

### 1.2 Puntos Fuertes
- **Separación de Responsabilidades**: Clara distinción entre la lógica de matchmaking (volátil/Redis) y la persistencia de historial (SQL).
- **Inyección de Dependencias**: El `MatchController` y `GameGateway` reciben sus dependencias, facilitando el testing.
- **Modularidad**: Uso de un `index.ts` centralizado y separación clara de carpetas (`services`, `controllers`, `gateways`).

---

## 2. Flujos de Partida

### 2.1 Partidas Públicas (Matchmaking)
- **Mecanismo**: Cola FIFO utilizando Redis Sorted Sets (`match:queue:public`).
- **Atomicidad**: Se utiliza `ZPOPMIN` para obtener usuarios de la cola de forma atómica, evitando condiciones de carrera donde dos usuarios podrían ser emparejados incorrectamente.
- **Persistencia**: Se crea la partida en DB con estado `active` inmediatamente tras encontrar oponente.
- **Observación Critica**: El flujo es robusto, pero depende de la disponibilidad de Redis. El manejo de errores `redisClient not available` es correcto.

### 2.2 Partidas Privadas
- **Estado Inicial**: Se crean con estado `pending`.
- **Invitación**: Se publica un evento `match.invite` en Redis.
- **Aceptación**: El invitado llama al endpoint `/accept`, pasando el estado de `pending` a `active`. Se publica `match.started`.
- **Rechazo/Cancelación**: Implementados correctamente (`rejected`, cancelación por creador).
- **Inconsistencia Detectada en DB**: El código hace update a `rejected`, pero se debe verificar si la restricción `CHECK` de la base de datos SQL permite este valor.

---

## 3. Validaciones y Seguridad

### 3.1 Autenticación (JWT)
- **HTTP**: Middleware `GameMiddleware.validateJWT` implementado correctamente usando `jsonwebtoken` y variables de entorno (`GameEnv`). Inyecta el usuario decodificado en `request.user`.
- **WebSockets**:
  - Al no soportar headers estándar en el handshake inicial del navegador, se implementa validación manual del token vía Query Param (`?token=...`).
  - **Riesgo**: Los tokens pasados por URL pueden quedar en logs de servidores intermedios/proxies. Es un compromiso aceptable para WS, pero se debe asegurar que el log de acceso no registre la query string completa en entornos de producción.

### 3.2 Schemas y Tipado
- Uso extensivo de TypeScript y Schemas compartidos (`@transcendence/shared`).
- Validación de entrada en rutas HTTP mediante `schema: MatchSchemas...` de Fastify.

---

## 4. Sistema de Notificaciones (🔴 PUNTO CRÍTICO)

**Hallazgo Principal:** El sistema de notificaciones está **INCOMPLETO**.

Mientras que el `MatchService` publica eventos correctamente a Redis:
- `match.invite`
- `match.started`
- `match.rejected`

**No existe ningún componente (Subscriber) que escuche estos eventos.**
- El `GameGateway` actual solo maneja conexiones de partidas activas (`activeMatches`).
- **Consecuencia**: Cuando el Usuario A invita al Usuario B, el evento se pierde en el éter de Redis. El Usuario B nunca recibe la notificación visual (toast/modal) porque nadie empuja ese mensaje a su WebSocket.
- **Solución Requerida**: Implementar un suscriptor de Redis en `GameGateway` (o un `NotificationService`) que escuche `game_events` y encamine los mensajes a los sockets conectados correspondientes a los `userId` objetivo.

---

## 5. Manejo de Errores

### 5.1 Estrategia "Bubble Up"
- Los repositorios y servicios lanzan excepciones tipadas (`SharedErrors`).
- El controlador (`MatchController`) captura estas excepciones y las mapea a códigos HTTP (400, 403, 404, 500).
- Esta estrategia es consistente y mantiene limpios los servicios.

### 5.2 Resiliencia
- **Redis Down**: Se controla explícitamente (`if (!redisClient) throw ...`).
- **Rollback**: El `MatchService` implementa lógica de compensación (borrar partida o revertir estado) si falla la fase de notificación post-DB.

---

## 6. Recomendaciones y Acciones Inmediatas

1.  **URGENTE**: Implementar el **Redis Subscriber** para el sistema de notificaciones. Sin esto, las invitaciones privadas son inutilizables (el usuario no se entera).
2.  **Base de Datos**: Verificar que el esquema SQL (`matches.sql`) incluya `rejected` en el constraint `CHECK (status IN (...))`.
3.  **WebSockets**: Implementar lógica de reconexión ("Graceful Reconnection"). Actualmente, si el socket se cierra, se pierde la partida casi inmediatamente (salvo por el TODO comentado en el código).
4.  **Limpieza**: Implementar un Cron Job o mecanismo TTL para limpiar invitaciones `pending` que nunca fueron respondidas y quedaron "zombies" en la tabla SQL.

---
**Conclusión General:**
El servicio tiene una base sólida y bien arquitecturada. La lógica core de juego y matchmaking es funcional. Sin embargo, la brecha en el sistema de notificaciones bloquea la funcionalidad de partidas privadas desde la perspectiva de experiencia de usuario.
