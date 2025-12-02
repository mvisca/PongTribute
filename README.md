ENDPOINTS POR GRUPOS

================================================================================
                    MAPA DE ENDPOINTS ft_transcendence
================================================================================

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                           FRONTEND (puerto 3000)                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTP Requests
                ┌─────────────────────┴─────────────────────┐
                │                                           │
                ▼                                           ▼
┌───────────────────────────────┐         ┌───────────────────────────────┐
│   AUTH SERVICE (3002)         │         │   USER SERVICE (3001)         │
│   /api/auth/*                 │         │   /api/users/*                │
└───────────────────────────────┘         └───────────────────────────────┘
                │                                           │
                │ X-Service-Secret                          │
                └──────────────► /internal/users/* ◄───────┘


================================================================================
GRUPO 1: RUTAS PÚBLICAS (Sin autenticación)
================================================================================
Consumer: Frontend anónimo, Formularios de registro/login

┌─────────────────────────────────────────────────────────────────────────────┐
│ SERVICE: USER (puerto 3001)                                                 │
└─────────────────────────────────────────────────────────────────────────────┘

  POST   /api/users
         └─ Crear nuevo usuario (registro)
         └─ Body: { username, email, password }
         └─ Response 201: UserPublic (sin passwordHash)

  GET    /api/users/check-username/:username
         └─ Verificar disponibilidad de username
         └─ Response 200: { available: boolean }

  GET    /api/users/check-email/:email
         └─ Verificar disponibilidad de email
         └─ Response 200: { available: boolean }

┌─────────────────────────────────────────────────────────────────────────────┐
│ SERVICE: AUTH (puerto 3002)                                                 │
└─────────────────────────────────────────────────────────────────────────────┘

  POST   /api/auth/login
         └─ Autenticar usuario y obtener JWT
         └─ Body: { email, password }
         └─ Response 200:
            • Sin 2FA: { token, refreshToken, user }
            • Con 2FA: { twoFactorRequired, provisionalToken, qr? }

  POST   /api/auth/verify-2fa
         └─ Completar login con código TOTP
         └─ Body: { provisionalToken, totpCode }
         └─ Response 200: { token, refreshToken, user }


================================================================================
GRUPO 2: RUTAS PROTEGIDAS (Requieren JWT Bearer token)
================================================================================
Consumer: Frontend autenticado (usuario logueado)
Middleware: AuthMiddleware.validateJWT

┌─────────────────────────────────────────────────────────────────────────────┐
│ SERVICE: USER (puerto 3001)                                                 │
└─────────────────────────────────────────────────────────────────────────────┘

  GET    /api/users/:id
         └─ Obtener datos de usuario por ID
         └─ Middleware adicional: verifyOwnership (solo propio perfil)
         └─ Response 200: UserPublic

  GET    /api/users/username/:username
         └─ Obtener usuario por username
         └─ Middleware adicional: verifyOwnership
         └─ Response 200: UserPublic

  PUT    /api/users/:id
         └─ Actualizar datos de usuario
         └─ Middleware adicional: verifyOwnership
         └─ Body: { username?, email?, avatar? }
         └─ Response 200: UserPublic

  PUT    /api/users/:id/anonymize
         └─ Anonimizar usuario (RGPD compliance)
         └─ Middleware adicional: verifyOwnership
         └─ Response 204: No Content

  DELETE /api/users/:id
         └─ Eliminar usuario (soft delete: is_deleted=1)
         └─ Middleware adicional: verifyOwnership
         └─ Response 204: No Content

┌─────────────────────────────────────────────────────────────────────────────┐
│ SERVICE: AUTH (puerto 3002)                                                 │
└─────────────────────────────────────────────────────────────────────────────┘

  POST   /api/auth/logout
         └─ Cerrar sesión y eliminar refresh tokens
         └─ Middleware adicional: verifyOwnership
         └─ Response 204: No Content

  PUT    /api/auth/:id/password
         └─ Cambiar contraseña (requiere oldPassword)
         └─ Middleware adicional: verifyOwnership
         └─ Body: { oldPassword, newPassword }
         └─ Response 204: No Content


================================================================================
GRUPO 3: RUTAS INTERNAS (Solo servicios backend)
================================================================================
Consumer: Comunicación inter-servicios
Autenticación: Header X-Service-Secret (NO JWT)
Middleware: validateServiceSecret

┌─────────────────────────────────────────────────────────────────────────────┐
│ SERVICE: USER (puerto 3001)                                                 │
│ Prefix: /internal/*                                                         │
└─────────────────────────────────────────────────────────────────────────────┘

  GET    /internal/users/by-email/:email
         └─ Obtener UserInternal por email (CON passwordHash)
         └─ Consumer: Auth service (login flow)
         └─ Response 200: UserInternal

  GET    /internal/users/by-id/:id
         └─ Obtener UserInternal por ID (CON passwordHash)
         └─ Consumer: Auth service (2FA flow, change password)
         └─ Response 200: UserInternal

  PATCH  /internal/users/:id/online-status
         └─ Actualizar estado isOnline
         └─ Consumer: Auth service (login/logout)
         └─ Body: { isOnline: boolean }
         └─ Response 204: No Content

  PUT    /internal/users/:id/password
         └─ Actualizar passwordHash directamente
         └─ Consumer: Auth service (change password)
         └─ Body: { newPasswordHash: string }
         └─ Response 204: No Content

┌─────────────────────────────────────────────────────────────────────────────┐
│ SERVICE: USER (puerto 3001) - Token Management                             │
│ Prefix: /api/internal/tokens/*                                             │
└─────────────────────────────────────────────────────────────────────────────┘

  POST   /api/internal/tokens/verify
         └─ Verificar validez de refresh token
         └─ Consumer: Auth service (refresh flow)
         └─ Body: { tokenHash: string }
         └─ Response 200: RefreshTokenRecord

  POST   /api/internal/tokens
         └─ Crear nuevo refresh token
         └─ Consumer: Auth service (login flow)
         └─ Body: { userId, tokenHash, expiresAt, is2FAVerified }
         └─ Response 201: RefreshTokenRecord

  DELETE /api/internal/tokens/user/:id
         └─ Eliminar todos los tokens de un usuario
         └─ Consumer: Auth service (logout, UNIQUE_SESSION)
         └─ Response 204: No Content

  DELETE /api/internal/tokens/expired
         └─ Limpiar tokens expirados (cron job)
         └─ Consumer: Scheduled task / Admin
         └─ Response 204: No Content


================================================================================
GRUPO 4: ENDPOINTS DE SISTEMA
================================================================================

  GET    /health (User service)
         └─ Health check del servicio
         └─ Consumer: Load balancer, Monitoring
         └─ Response 200: { status, service, timestamp, uptime }

  GET    /health (Auth service)
         └─ Health check del servicio
         └─ Consumer: Load balancer, Monitoring
         └─ Response 200: { status, service, timestamp, uptime }

================================================================================
FLUJO DE AUTENTICACIÓN COMPLETO
================================================================================

1  POST /api/auth/login (email, password)
    ↓
2 Auth → GET /internal/users/by-email/:email (X-Service-Secret)
    ↓
3  bcrypt.compare(password, user.passwordHash)
    ↓
4  ¿Tiene 2FA habilitado?
    │
    ├─ NO → 
    │   ├─ Auth → POST /api/internal/tokens (crear refresh token)
    │   ├─ Auth → PATCH /internal/users/:id/online-status (isOnline=true)
    │   └─ Response: { token, refreshToken, user }
    │
    └─ SÍ →
        ├─ Generar provisionalToken (JWT temporal, purpose: '2fa_verification')
        └─ Response: { twoFactorRequired, provisionalToken, qr? }
            ↓
        5  POST /api/auth/verify-2fa (provisionalToken, totpCode)
            ↓
        6  Auth → GET /internal/users/by-id/:id (obtener totpSecret)
            ↓
        7  speakeasy.totp.verify(totpCode, totpSecret)
            ↓
        8  Auth → POST /api/internal/tokens + PATCH online-status
            └─ Response: { token, refreshToken, user }


================================================================================
ENDPOINTS QUE EXPONEN DATOS SENSIBLES
================================================================================

- /internal/users/by-email/:email → Retorna UserInternal (CON passwordHash)
  Auth service necesita passwordHash para bcrypt.compare
  Protección: X-Service-Secret + solo accesible desde backend

- /internal/users/by-id/:id → Retorna UserInternal (CON passwordHash, totpSecret)
  Auth service necesita totpSecret para verificar 2FA
  Protección: X-Service-Secret + solo accesible desde backend

- /api/internal/tokens/verify → Retorna RefreshTokenRecord (CON tokenHash)
  Auth service necesita verificar refresh tokens
  Protección: X-Service-Secret + tokenHash ya es hash SHA-256


================================================================================