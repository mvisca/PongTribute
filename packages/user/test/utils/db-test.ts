import Database from "better-sqlite3";
import { getDatabase, closeDatabase } from "../../src/connection.js";

// Forzar base de datos en memoria para aislar las pruebas
process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.USER_SERVICE_DB_FULL_PATH = process.env.USER_SERVICE_DB_FULL_PATH || ":memory:";

let db: Database.Database | null = null;

export function setupTestDB(): Database.Database {
	if (db) return db;

	db = getDatabase();
	return db;
}

export function getTestDB(): Database.Database {
	return db ?? setupTestDB();
}

export function resetTestDB(): void {
	const database = getTestDB();
	// El orden evita fallos por claves foráneas
	const tables = ["friendships", "refresh_tokens", "users"];
	for (const table of tables) {
		database.prepare(`DELETE FROM ${table}`).run();
	}
}

export function closeTestDB(): void {
	if (db) {
		closeDatabase();
		db = null;
	}
}

