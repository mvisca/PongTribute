import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { UserEnv } from './index.js';

// ES Module compatibility: Recrear __dirname y __filename que no existen en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Declara variable Singleton
// No inicializada
// Será compartida por todas las llamadas a getDatabase()
let db: Database.Database | null = null;

process.on('SIGINT', () => {
	console.log('SIGINT: Closing Database');
	closeDatabase();
	db = null;
});

process.on('SIGTERM', () => {
	console.log('SIGTERM: Closing Database');
	closeDatabase();
	db = null;
}); // TODO revisar implementacion de señales, consitente en pattern y servicios, esta implementacion está ok o repetida, ver capas

export function getDatabase(): Database.Database {
	// LAZY INIT: solo se inicializa si se necesita (1st call)
	// Para siguientes llamadas a getDatabse(), db ya está creada
	if (!db) {
		try {
			db = new Database(UserEnv.USER_SERVICE_DB_FULL_PATH);
			// Write ahead loggin
			db.pragma('journal_mode = WAL');
			// Foreing keys está off por defecto
			// Con esto se activa ON DELETE CASCADE
			db.pragma('foreign_keys = ON');
			// Lee archivos SQL con tablas e indexes en formato utf-8
			// Se separan tablas de codigo, más mantenible
			// Idempotencia = CREATE TABLE IF NOT EXISTS
			// Es seguro ejecturar múltipes veces
	
			const tablesSQL = fs.readFileSync(
				path.join(__dirname, 'schemas/users_tables.sql'),
				'utf-8'
			);
	
			db.exec(tablesSQL);
		} catch(err) {
			console.error('Error incializando DB: ', err);
			process.exit(1);
		}
		
		

		console.log('DB inicializada: ', UserEnv.USER_SERVICE_DB_FULL_PATH, '\n[ ', __filename, ' ]');
	}
	// Si ya existe el Singleton lo retorna directamente
	return db;
}

export function closeDatabase(): void {
	// Solo cierra si existe
	if (db) {
		db.close();
		db = null;
		console.log('DB cerrada: ', __filename);
	}
}