-- ============================================================================
-- TABLA: users
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  avatar TEXT,
  is_online INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- ============================================================================
-- TABLA: friendships
-- ============================================================================
CREATE TABLE IF NOT EXISTS friendships (
  user_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, friend_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (user_id < friend_id)
);

-- ============================================================================
-- TABLA: matches
-- ============================================================================
-- Partidas 1v1 de Pong
-- winner_id es NULL mientras la partida está activa
-- finished_at es NULL mientras la partida está activa
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'active',
  winner_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================================
-- TABLA: match_participants
-- ============================================================================
-- Jugadores en cada partida (siempre 2 para 1v1)
-- player_slot: "Player1" o "Player2"
-- player_position: "left" o "right"
CREATE TABLE IF NOT EXISTS match_players (
  match_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  player_slot TEXT NOT NULL,
  player_position TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  PRIMARY KEY (match_id, user_id),
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- TABLA: tournaments
-- ============================================================================
CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  number_of_players INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  finished_at INTEGER
);