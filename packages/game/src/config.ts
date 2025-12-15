import path from 'path';
import { SharedEnv } from '@transcendence/shared';

const env = SharedEnv.build();

export const SERVER_PORT = parseInt(process.env.PORT || '3003');
export const JWT_SECRET = env.JWT_SECRET;

// Patrón de rutas: Base -> Filename -> Full Path
export const DB_BASE_PATH = env.GAME_SERVICE_DB_PATH || '../../db-data';
export const DB_FILENAME = 'game.sqlite';
export const DB_FULL_PATH = path.join(DB_BASE_PATH, DB_FILENAME);

/* EXPLICACIÓN:
1. SharedEnv.build(): Trae las variables de entorno compartidas (como secretos y rutas base).
2. DB_BASE_PATH: Define dónde se guardan los archivos (usa la variable de entorno o un fallback relativo).
3. DB_FILENAME: Nombre específico para la DB de este microservicio.
4. DB_FULL_PATH: Une ambas partes usando 'path.join' para asegurar compatibilidad entre SO (Windows/Linux).
*/