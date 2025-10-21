/*
Tablas del sistema
 */

CREATE TABLE IF NOT EXISTS users (
	id TEXT PRIMARY KEY,
	username TEXT UNIQUE NOT NULL,
	email TEXT UNIQUE,
	password_hash TEXT NOT NULL,
	avatar TEXT,
	is_online INTEGER DEFAULT 0,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_stats (
	user_id TEXT PRIMARY KEY,
	total_matches INTEGER DEFAULT 0,
	wins INTEGER DEFAULT 0,
	losses INTEGER DEFAULT 0,
	win_rate REAL DEFAULT 0.0,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS friendships (
	user_id TEXT NOT NULL,
	friend_id TEXT NOT NULL,
	status TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	PRIMARY KEY (user_id, friend_id),
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
	FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
	CHECK (user_id != friend_id)
);

CREATE TABLE IF NOT EXISTS matches (
	id TEXT PRIMARY KEY,
	game_title TEXT NOT NULL,
	court_type TEXT NOT NULL,
	status TEXT NOT NULL,
	winner_id TEXT,
	created_at INTEGER NOT NULL,
	finished_at INTEGER,
	FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS match_participants (
	match_id TEXT NOT NULL,
	user_id TEXT NOT NULL,
	player_slot TEXt NOT NULL,
	position TEXT NOT NULL,
	score INTEGER DEFAULT 0,
	PRIMARY KEY (match_id, user_id),
	FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tournaments (
	id TEXT NOT NULL,
	number_of_players INTEGER,
	users_ids INTEGER[],
	playoffs JSON,
	PRIMARY KEY (id)
);