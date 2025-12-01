import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { GameEnv } from './config.js';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
    if (!db) {
        const dbPath = GameEnv.serverConfig.dbPath;
        
        // Asegurar directorio
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        console.log(`🔌 Conectando a Game DB en: ${dbPath}`);
        db = new Database(dbPath);
        db.pragma('journal_mode = WAL');
        
        // Cargar TODOS los esquemas SQL en la carpeta schemas
        const schemasDir = path.join(process.cwd(), 'src/schemas');
        
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
            console.error('CRITICAL: No se encontró directorio src/schemas');
        }
    }
    return db;
}