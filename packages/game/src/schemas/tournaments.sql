-- packages/game/src/schemas/tournaments.sql

-- El subject pide explícitamente gestionar Aliases (nombres temporales) para el torneo.
-- Por eso necesitamos una tabla extra.
-- ============================================================================
-- TABLA: tournaments
-- ============================================================================
CREATE TABLE IF NOT EXISTS tournaments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL, -- Nombre del torneo
    status TEXT NOT NULL CHECK(status IN ('pending', 'active', 'finished')) DEFAULT 'pending',
    
    winner_id TEXT, -- ID del usuario real que ganó
    
    created_at INTEGER NOT NULL,
    finished_at INTEGER
);

-- ============================================================================
-- TABLA: tournament_participants
-- ============================================================================
-- Esta tabla es CRÍTICA para cumplir el subject:
-- "At the start of a tournament, each player must input their alias."
CREATE TABLE IF NOT EXISTS tournament_participants (
    tournament_id TEXT NOT NULL,
    user_id TEXT NOT NULL, -- El usuario real logueado
    alias TEXT NOT NULL,   -- El nombre que se mostrará en el bracket
    
    PRIMARY KEY (tournament_id, user_id),
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);