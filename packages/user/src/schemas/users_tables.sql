-- ============================================================================
-- TABLA: users
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT,
  auth_provider TEXT NOT NULL DEFAULT 'local',
  oauth_id TEXT,
  avatar TEXT,
  is_online INTEGER DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,
  has_2fa_enabled INTEGER DEFAULT 0,
  backup_code_hash TEXT DEFAULT NULL,
  totp_secret TEXT DEFAULT NULL,
  last_logout_at INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_oauth_identity ON users(auth_provider, oauth_id)
WHERE auth_provider != 'local';

-- ============================================================================
-- TABLA: refresh_tokens
-- ============================================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	token_hash TEXT UNIQUE NOT NULL,
	expires_at INTEGER NOT NULL,
	is_2fa_verified INTEGER DEFAULT 0,
	created_at INTEGER NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- TABLA: friendships
-- ============================================================================
CREATE TABLE IF NOT EXISTS friendships (
  user_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,
  initiator_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, friend_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (user_id < friend_id)
);
