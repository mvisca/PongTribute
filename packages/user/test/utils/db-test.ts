import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Forzar base de datos en memoria para aislar las pruebas
process.env.USER_SERVICE_DB_FULL_PATH = ":memory:";

const SCHEMA_PATH = path.resolve(__dirname, "../../src/schemas/users_tables.sql");

let db: Database.Database | null = null;

function loadSchema(database: Database.Database): void {
	const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
	database.exec(schema);
}

export function setupTestDB(): Database.Database {
	if (db) return db;

	db = new Database(":memory:");
	db.pragma("journal_mode = WAL");
	db.pragma("foreign_keys = ON");

	loadSchema(db);
	return db;
}

export function getTestDB(): Database.Database {
	return db ?? setupTestDB();
}

export function resetTestDB(): void {
	if (!db) return;
	// El orden evita fallos por claves foráneas
	const tables = ["friendships", "refresh_tokens", "users"];
	for (const table of tables) {
		db.prepare(`DELETE FROM ${table}`).run();
	}
}

export function closeTestDB(): void {
	if (db) {
		db.close();
		db = null;
	}
}

