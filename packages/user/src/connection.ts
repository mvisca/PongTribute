import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { UserEnv } from './index.js';

// ES Module compatibility: Recrear __dirname y __filename que no existen en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Declara variable Singleton, no inicializada, compartida por todas las llamadas a detDatabase()
let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
	// LAZY INIT: solo se inicializa si se necesita (1st call)
	// Para siguientes llamadas a getDatabse(), db ya está creada
	if (!db) {
		const dbPath = UserEnv.USER_SERVICE_DB_FULL_PATH();
		
		// Asegurar directorio de la DB
		const dbDir = path.dirname(dbPath);
		if (!fs.existsSync(dbDir)) {
			fs.mkdirSync(dbDir, { recursive: true });
		}
		
		console.log(`🔌 Conectando a Game DB en: ${dbPath}`);
		db = new Database(dbPath);
		
		// Write ahead loggin
		db.pragma('journal_mode = WAL');
		// Foreing keys está off por defecto
		// Con esto se activa ON DELETE CASCADE
		db.pragma('foreign_keys = ON');
		
		db.pragma('busy_timeout = 5000');
		// Lee archivos SQL con tablas e indexes en formato utf-8
		// Se separan tablas de codigo, más mantenible
		// Idempotencia = CREATE TABLE IF NOT EXISTS
		// Es seguro ejecturar múltipes veces	
		const schemasDir = path.join(__dirname, 'schemas');
		
		if (fs.existsSync(schemasDir)){
			const files = fs.readdirSync(schemasDir).filter(file => file.endsWith('.sql'));
			
			for (const file of files) {
				const schemaPath = path.join(schemasDir, file);
				const schema = fs.readFileSync(schemaPath, 'utf-8');
				
				try {
					db.exec(schema);
					console.log(`Esquema cargado: ${file}`);
				} catch (err) {
					console.error(`Errod cargando ${file}:`, err);
				}
			}
		} else {
			console.error(`CRITICAL: No se encontró directorio 'schemas' en ${schemasDir}`);
		}
		
		console.log('DB inicializada: ', UserEnv.USER_SERVICE_DB_FULL_PATH(), '\n[ ', __filename, ' ]');
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