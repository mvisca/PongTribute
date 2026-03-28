-- packages/game/src/schemas/matches.sql
-- Fusiona la tabla matches antigua con los datos utiles de match_players
-- Este diseño presenta una estructura desnormalizada para gestionar partidas,
-- lo cual es muy eficiente para juegos 1v1 como Pong. En lugar de tener una 
-- tabla separada para unir jugadores con partidas (match_players), incrusta 
-- a los dos jugadores (player1 y player2) directamente en la entidad matches.
 -- ============================================================================
-- TABLA: matches
-- ============================================================================
CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL CHECK(status IN ('pending', 'active', 'finished', 'rejected', 'expired')) DEFAULT 'pending',
    
    -- JUGADOR 1 (Host) - Fusionamos datos de match_players aquí
    player1_id TEXT NOT NULL,
	player1_username TEXT NOT NULL,
	player1_avatar TEXT NOT NULL DEFAULT '',
    player1_score INTEGER DEFAULT 0,
    
    -- JUGADOR 2 (Rival) - Fusionamos datos de match_players aquí
    player2_id TEXT, -- Puede ser NULL si es matchmaking esperando rival
	player2_username TEXT, --Puede ser NULL al inicio
	player2_avatar TEXT,
    player2_score INTEGER DEFAULT 0,
    
    winner_id TEXT,
    
	game_mode TEXT DEFAULT 'classic',
    target_score INTEGER DEFAULT 11,

    -- Metadatos
    created_at INTEGER NOT NULL,
    finished_at INTEGER
);

-- Índices para velocidad (Inspirados en indexes.sql [cite: 229])
-- No tiene que recorrer toda la base (fila a fila) para encontrar algo
-- sino que le permite saltar a las filas relevantes.
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_p1 ON matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_p2 ON matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_matches_finished ON matches(finished_at DESC);