import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { GameEnv } from './config.js';

// Truco para tener __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
	if (!db) {
		const dbPath = GameEnv.GAME_SERVICE_DB_FULL_PATH();

		// Asegurar directorio de la DB
		const dbDir = path.dirname(dbPath);
		if (!fs.existsSync(dbDir)) {
			fs.mkdirSync(dbDir, { recursive: true });
		}

		console.log(`🔌 Conectando a Game DB en: ${dbPath}`);
		db = new Database(dbPath);
		// Establece el mode WAL (+velocidad, solo bloquea 'escritura' vs 'escritura')
		db.pragma('journal_mode = WAL');

		// TODO: para evitar problemas de bloqueo cuando haya alta concurrencia
		// configurar un tiempo de espera (busy_timeout) para que la 
		// aplicación "espere" unos milisegundos a que se libere el bloqueo
		//  antes de fallar. Con 5000 ms es suficiente para que las escrituras
		//  se pongan en cola y se ejecuten secuencialmente sin lanzar errores.

		const schemasDir = path.join(__dirname, 'schemas');

		if (fs.existsSync(schemasDir)) {
			const files = fs.readdirSync(schemasDir).filter(file => file.endsWith('.sql'));

			for (const file of files) {
				const schemaPath = path.join(schemasDir, file);
				const schema = fs.readFileSync(schemaPath, 'utf-8');
				try {
					db.exec(schema);
					console.log(`Esquema cargado: ${file}`);
				} catch (err) {
					console.error(`Error cargando ${file}:`, err);
				}
			}
		} else {
			console.error(`CRITICAL: No se encontró directorio schemas en: ${schemasDir}`);
		}
	}
	return db;
}