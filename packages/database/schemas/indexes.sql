-- Índices para optimizar consultas frecuentes

-- ============================================================================
-- USERS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_online ON users(is_online);

-- ============================================================================
-- FRIENDSHIPS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- ============================================================================
-- MATCHES
-- ============================================================================
-- Búsqueda por fecha de creación (historial ordenado cronológicamente)
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at);

-- Búsqueda por fecha de finalización (partidas activas vs finalizadas)
CREATE INDEX IF NOT EXISTS idx_matches_finished_at ON matches(finished_at);

-- Búsqueda por ganador (stats de victorias por usuario)
CREATE INDEX IF NOT EXISTS idx_matches_winner_id ON matches(winner_id);

-- ============================================================================
-- MATCH_PARTICIPANTS
-- ============================================================================
-- Búsqueda de todas las partidas de un usuario (historial de jugador)
CREATE INDEX IF NOT EXISTS idx_match_players_user_id ON match_players(user_id);

-- Búsqueda de participantes de una partida específica
CREATE INDEX IF NOT EXISTS idx_match_players_match_id ON match_players(match_id);