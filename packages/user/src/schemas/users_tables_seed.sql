-- ============================================================================
-- SEED: bot user (sistema)
-- ============================================================================
-- Añade a la DB 'users' un registro de BOT para que el servicio 'game' lo valide 
-- correctamente al entrar en una partida.
-- INSERT OR IGNORE garantiza idempotencia: es seguro ejecutarlo en cada
-- arranque del servidor aunque el registro ya exista.
--
-- last_logout_at = 0 es el valor crítico: garantiza que cualquier JWT
-- generado por el bot (iat > 0) siempre supera la validación de
-- revocación de token en GameGateway.
-- ============================================================================

INSERT OR IGNORE INTO users (
    id,
    username,
    email,
    password_hash,
    avatar,
    is_online,
    is_deleted,
    has_2fa_enabled,
    last_logout_at,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000b07',
    'HAL',
    'bot@transcendence.local',
    '$2b$10$BOTUSER.NEVER.LOGIN.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    'https://res.cloudinary.com/dayvpa0ql/image/upload/v1766352027/hal_a6chox.png',
    0,
    0,
    0,
    0,
    1700000000000,
    1700000000000
);
