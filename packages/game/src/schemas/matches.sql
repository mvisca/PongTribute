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
