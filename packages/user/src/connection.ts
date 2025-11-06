import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

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
});

export function getDatabase(): Database.Database {
	// LAZY INIT: solo se inicializa si se necesita (1st call)
	// Para siguientes llamadas a getDatabse(), db ya está creada
	if (!db) {
		const dbPath = process.env.DB_PATH ||
			path.join('../../db-data/user.db');
		
		db = new Database(dbPath); /*, {
			verbose: (sql) => {
				if (process.env.NODE_ENV === 'development') {
					console.log('[SQL]', sql);
				}
			}
		});*/
		
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

		console.log('DB inicializada: ', dbPath, '\n[ ', __filename, ' ]');
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