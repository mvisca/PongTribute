# Auditoría General de Seguridad — ft_transcendence

**Fecha:** 20 de febrero de 2026  
**Alcance:** auth, user, game, gateway, comms, images, nginx, shared  
**Nota:** El servicio frontend está muy poco implementado y no se incluyó en profundidad.

---

## Resumen Ejecutivo

Se auditaron los 8 servicios del proyecto analizando autenticación, autorización, validación de entrada, infraestructura Docker, configuración de red, WebSockets, Redis Pub/Sub y dependencias.

| Severidad | Total |
|-----------|-------|
| **CRÍTICA** | 8 |
| **ALTA** | 14 |
| **MEDIA** | 24 |
| **BAJA** | 12 |
| **INFO** | 6 |

---

## HALLAZGOS CRÍTICOS (8)

### C1. Secrets con defaults inseguros en código fuente

- **Servicios:** shared, auth, user, comms
- **Archivos:**
  - `packages/shared/src/config/sharedEnv.ts` — `JWT_SECRET: 'default_super_secret_key_CHANGE_THIS'`, `SERVICE_SECRET: 'default_shared_secret_CHANGE_THIS'`
  - `packages/comms/src/config.ts` — `jwtSecret: process.env.JWT_SECRET || ''` (cadena vacía permite firmar/verificar JWTs triviales)
- **Riesgo:** Si se despliega sin `.env`, cualquiera puede firmar JWTs válidos o autenticarse como servicio interno.
- **Fix:** Eliminar todos los defaults para secrets. Hacer que el arranque falle si no están definidos.

---

### C2. Gateway expuesto saltando Nginx/TLS

- **Archivo:** `docker-compose.yml` — `ports: - "3000:3000"` en el servicio gateway
- **Riesgo:** Cualquier cliente puede enviar peticiones HTTP en claro a `http://host:3000/api/*`, saltando Nginx, TLS y todos los security headers.
- **Fix:** Cambiar `ports` por `expose: ["3000"]`.

---

### C3. WebSockets de Comms y Game puentean el Gateway

- **Archivo:** `packages/nginx/conf.d/default.conf` — Nginx enruta `/api/comms/ws` → `comms:3005` y `/api/game/ws` → `game:3003` directamente
- **Riesgo:** La lógica de seguridad WS del gateway (origin check, rate-limiting por IP, max connections) **nunca se ejecuta** para conexiones que llegan vía Nginx.
- **Fix:** Enrutar WebSockets a través del gateway o replicar las validaciones en cada servicio.

---

### C4. Sin validación de Origin en WebSocket upgrades del Game (CSWSH)

- **Archivo:** `packages/game/src/routes/game.routes.ts` — `app.get('/game/ws', { websocket: true }, ...)`
- **Riesgo:** Cross-Site WebSocket Hijacking — un sitio malicioso puede abrir WS desde el navegador de la víctima. No se valida `req.headers.origin`.
- **Fix:** Verificar `req.headers.origin` contra una allowlist (`FRONTEND_URL`) antes de aceptar la conexión WebSocket.

---

### C5. Missing `return` después de 401 en `deleteFriendship`

- **Archivo:** `packages/user/src/controllers/friendController.ts` — tras enviar `reply.code(401)`, la ejecución continúa
- **Riesgo:** Un usuario no autorizado puede ejecutar la eliminación de una amistad porque el `return` falta.
- **Fix:** Añadir `return` después de `reply.code(401).send(...)`.

---

### C6. SERVICE_SECRET vulnerable a timing attack

- **Archivo:** `packages/user/src/middleware/authMiddleware.ts` — comparación con `===`
- **Riesgo:** Un atacante puede deducir el secret carácter a carácter midiendo tiempos de respuesta.
- **Fix:** Usar `crypto.timingSafeEqual()`.

---

### C7. Todos los contenedores ejecutan como root

- **Archivos:** Todos los Dockerfiles en `packages/`
- **Riesgo:** Si hay una vulnerabilidad RCE, el atacante obtiene root dentro del contenedor.
- **Fix:** Añadir `USER node` (o `USER nonroot`) en cada Dockerfile.

---

### C8. Redis sin contraseña

- **Archivo:** `docker-compose.yml` — `redis-server --appendonly yes` sin `--requirepass`
- **Riesgo:** Cualquier contenedor en la red puede conectarse sin autenticación, leer/escribir datos, y publicar eventos maliciosos en Pub/Sub.
- **Fix:** Añadir `--requirepass $REDIS_PASSWORD`.

---

## HALLAZGOS ALTOS (14)

### H1. JWT transmitido en URL query param para WebSockets

- **Servicios:** game, comms
- **Archivos:** `packages/game/src/gateways/GameGateway.ts`, `packages/comms/src/middlewares/auth.middleware.ts`
- **Riesgo:** El JWT viaja en `ws://host/api/game/ws?token=...`. Las URLs quedan en logs de proxies, historial del navegador, cabecera `Referer` y herramientas de monitorización.
- **Fix:** Implementar un sistema de ticket efímero: el cliente solicita un ticket temporal vía REST (con Bearer JWT), recibe un token de un solo uso con TTL ~10s almacenado en Redis, y lo envía por query param para el WS upgrade.

---

### H2. Sin rate limiting en mensajes WebSocket

- **Servicio:** game
- **Archivo:** `packages/game/src/gateways/GameGateway.ts`
- **Riesgo:** Un cliente malicioso puede enviar miles de mensajes por segundo. Cada mensaje se parsea con `JSON.parse` y ejecuta lógica de negocio. DoS por flooding.
- **Fix:** Implementar un rate limiter por socket (e.g., máximo 120 mensajes/segundo) y desconectar al socket que exceda el límite.

---

### H3. Sin rate limiting HTTP global

- **Servicios:** game, comms, gateway
- **Riesgo:** No hay `@fastify/rate-limit` registrado en estos servicios. Rutas como `POST /matches` pueden ser abusadas con brute force o flooding.
- **Fix:** Registrar `@fastify/rate-limit` con configuración por ruta o global.

---

### H4. Sin rate limiting en `/api/auth/login`

- **Servicio:** auth
- **Riesgo:** Solo las rutas 2FA tienen rate-limit; login y register no. Permite brute force de credenciales.
- **Fix:** Añadir rate-limit estricto a `/login` y `/register`.

---

### H5. Historial de partidas accesible sin verificar propiedad (IDOR)

- **Servicio:** game
- **Archivo:** `packages/game/src/controllers/MatchController.ts`
- **Riesgo:** Cualquier usuario autenticado puede consultar el historial de **cualquier otro usuario** pasando su UUID en la URL. `userId` viene del parámetro URL, no del JWT.
- **Fix:** Verificar que `req.user!.id === userId` o documentar como endpoint público intencionalmente.

---

### H6. Datos Redis Pub/Sub no validados con schema

- **Servicio:** game
- **Archivo:** `packages/game/src/subscribers/MatchEventSubscriber.ts`
- **Riesgo:** `JSON.parse(message) as SystemEvent` — el cast no valida en runtime. Si Redis es comprometido o un servicio envía un mensaje malformado, un atacante podría provocar la desconexión de usuarios arbitrarios o manipular partidas.
- **Fix:** Validar con `Value.Check()` de TypeBox contra schemas estrictos antes de procesar.

---

### H7. Cron Jobs duplicados — condiciones de carrera

- **Servicio:** game
- **Archivos:** `packages/game/src/server.ts` y `packages/game/src/routes/game.routes.ts`
- **Riesgo:** **Ambos** archivos registran intervalos de `pruneQueues` y `prunePrivateInvites` cada 10 segundos con instancias diferentes. Genera doble notificación, condiciones de carrera y consumo innecesario.
- **Fix:** Eliminar el cron de `server.ts` y dejarlo solo en `game.routes.ts`.

---

### H8. Sin segmentación de red Docker

- **Archivo:** `docker-compose.yml` — red única `transcendence`
- **Riesgo:** Todos los servicios comparten una única red. Redis, bases de datos y todos los microservicios pueden comunicarse libremente. Un servicio comprometido tiene acceso a todo.
- **Fix:** Crear redes separadas (frontend, backend, data) y asignar cada servicio solo a las que necesite.

---

### H9. Dockerfiles sin multi-stage real

- **Archivos:** Todos los Dockerfiles Node.js
- **Riesgo:** Declaran `FROM ... AS build` pero nunca crean segunda etapa. La imagen final contiene código fuente completo, devDependencies y herramientas de compilación.
- **Fix:** Implementar multi-stage real: compilar en stage 1, copiar solo artefactos a stage 2.

---

### H10. Passwords enviados en texto plano entre servicios

- **Servicio:** auth → user
- **Archivo:** `packages/auth/src/services/authService.ts`
- **Riesgo:** `fetch(userService, { body: { password } })` envía la contraseña vía HTTP interno sin cifrar.
- **Fix:** Hashear la contraseña en el servicio auth antes de enviarla, o hacer el hashing en el user service pero asegurar TLS interno.

---

### H11. Rutas 2FA sin rate limiting

- **Servicio:** auth
- **Riesgo:** `/api/auth/2fa/verify` permite brute force del código TOTP (6 dígitos = 1M combinaciones).
- **Fix:** Rate-limit estricto (max 5 intentos/minuto) en rutas 2FA.

---

### H12. Backup codes con solo 4 bytes de entropía

- **Servicio:** auth
- **Riesgo:** `crypto.randomBytes(4)` = 8 chars hex = 2^32 combinaciones. Insuficiente para resistir brute force.
- **Fix:** Usar `crypto.randomBytes(8)` o más (16 chars hex = 2^64 combinaciones).

---

### H13. Nombres de columna dinámicos en SQL

- **Servicio:** user
- **Archivo:** `packages/user/src/repositories/userRepository.ts`
- **Riesgo:** `UPDATE users SET ${column} = ?` — si `column` proviene de entrada del usuario sin validar contra allowlist, permite SQL injection.
- **Fix:** Validar `column` contra una lista blanca de nombres de columna permitidos.

---

### H14. `skipOnError: true` desactiva rate-limit si Redis falla

- **Servicios:** auth, user
- **Riesgo:** Si Redis cae, el rate-limiting se desactiva silenciosamente. Un atacante podría provocar la caída de Redis y luego hacer brute force.
- **Fix:** Cambiar a `skipOnError: false` o implementar un rate-limiter en memoria como fallback.

---

## HALLAZGOS MEDIOS (24)

| # | Hallazgo | Servicio | Archivo/Nota |
|---|----------|----------|--------------|
| M1 | CSP con `unsafe-inline` en script-src | nginx | `packages/nginx/conf.d/default.conf` — anula protección XSS |
| M2 | `X-Forwarded-For` confiado sin validación | gateway | `packages/gateway/src/app.ts` — permite falsificar IP |
| M3 | Swagger/Docs expuesto sin autenticación | gateway, game | Rutas `/docs` públicas filtran estructura de API |
| M4 | Sin `maxPayload` en WebSocket (default 100MB) | game | `packages/game/src/app.ts` — permite mensajes enormes |
| M5 | `processInput` no valida payload del juego con schema | game | `packages/game/src/services/GameService.ts` — solo `JSON.parse` |
| M6 | Datos de Redis local match no tipados ni validados | game | `GameService.ts` — `JSON.parse` sin schema |
| M7 | ID fijo `guest-player-id` en partidas locales | game | `MatchService.ts:345` — predecible, no UUID |
| M8 | Sin límite de conexiones WS simultáneas por usuario | game | Nuevas conexiones sobrescriben las anteriores |
| M9 | Helmet CSP deshabilitado en servicios | game, auth | `contentSecurityPolicy: false` |
| M10 | TOTP secret almacenado en texto plano en DB | user | Sin cifrado at-rest |
| M11 | User enumeration via `/check-username` y `/check-email` | user | Respuestas diferentes según existencia |
| M12 | Anonymización incompleta (GDPR) | user | No se borran todos los datos personales |
| M13 | Errores internos expuestos en Images service | images | `err.message` devuelto al cliente |
| M14 | bcrypt rounds hardcoded a 10 (inconsistente) | auth | Debería ser configurable y ≥12 |
| M15 | Sin límites de recursos en la mayoría de contenedores | docker | Solo `images` tiene `deploy.resources.limits` |
| M16 | HSTS incompleto | nginx | Falta `includeSubDomains` y `preload` |
| M17 | `server_tokens` no deshabilitado en Nginx | nginx | Expone versión de Nginx |
| M18 | Uso de `any` para matchData pierde type safety | game | `let matchData: any` en `joinMatch` |
| M19 | `console.log` con datos de usuarios en producción | game, varios | Usernames y matchIDs en logs sin condición |
| M20 | `fetchUserProfile` devuelve 'Unknown' silenciosamente | game | `MatchService.ts` — partidas con datos incompletos |
| M21 | `finishMatch` en fire-and-forget puede perder resultados | game | `GameService.ts` — error solo se loguea |
| M22 | Timestamp no normalizado en JWT vs lastLogoutAt | game | `game.middleware.ts` — ms vs seconds |
| M23 | Refresh tokens almacenados con SHA-256 | auth | Debería usar argon2 o bcrypt para tokens |
| M24 | Sin CORS configurado en auth service | auth | Falta `@fastify/cors` |

---

## HALLAZGOS BAJOS (12)

| # | Hallazgo | Servicio |
|---|----------|----------|
| L1 | Cabecera `X-XSS-Protection` obsoleta | nginx |
| L2 | Timeout WS proxy 7 días excesivo | nginx |
| L3 | Sin validación magic bytes en imágenes | images (mitigado por Cloudinary) |
| L4 | Certificados dev auto-generados RSA-2048 sin SAN | nginx |
| L5 | `finishMatch` fire-and-forget puede perder resultados | game |
| L6 | Timestamp no normalizado en comparación JWT | game |
| L7 | `console.log` con datos sensibles en producción | game, varios |
| L8 | `fetchUserProfile` devuelve 'Unknown' silenciosamente | game |
| L9 | Health endpoints expuestos sin autenticación | game, auth |
| L10 | Uso de SQLite en producción | game, user |
| L11 | `InternalError.toJSON()` oculta detalles correctamente | shared ✓ |
| L12 | Swagger UI público puede filtrar rutas internas | gateway |

---

## HALLAZGOS INFORMATIVOS (6)

| # | Hallazgo | Nota |
|---|----------|------|
| I1 | CORS configurado con origin específico (no wildcard) | ✅ Correcto |
| I2 | No se detectaron open redirects | ✅ `$host$request_uri` seguro |
| I3 | No se detectó SSRF | ✅ Proxy restringido por rutas |
| I4 | `InternalError` nunca expone stack traces al cliente | ✅ Correcto |
| I5 | Redis con AOF y save periódico configurado | ✅ Persistencia correcta |
| I6 | SQLite con WAL y busy_timeout configurado | ✅ Adecuado para el tráfico esperado |

---

## Top 10 — Acciones Prioritarias

| Prioridad | Acción | Hallazgo | Esfuerzo |
|-----------|--------|----------|----------|
| 1 | Eliminar defaults de secrets, validar en arranque | C1 | Bajo |
| 2 | Quitar `ports: 3000` del gateway, usar `expose` | C2 | Mínimo |
| 3 | Añadir `--requirepass` a Redis | C8 | Bajo |
| 4 | Añadir validación Origin en WS del game y comms | C3, C4 | Medio |
| 5 | Fix `return` faltante en `deleteFriendship` | C5 | Mínimo |
| 6 | Usar `crypto.timingSafeEqual` para SERVICE_SECRET | C6 | Mínimo |
| 7 | Añadir `USER node` a todos los Dockerfiles | C7 | Bajo |
| 8 | Implementar rate-limiting global en game/comms/gateway | H3, H4 | Medio |
| 9 | Rate-limit en mensajes WebSocket | H2 | Medio |
| 10 | Validar datos de Redis Pub/Sub con schema | H6 | Medio |

---

> **Nota:** Las vulnerabilidades **C1-C8** deberían resolverse antes de cualquier despliegue. Las **H1-H14** representan vectores de ataque explotables que requieren atención a corto plazo. Las categorías M y L pueden abordarse progresivamente.
