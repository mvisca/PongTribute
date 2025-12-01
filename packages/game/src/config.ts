import { SharedEnv } from '@transcendence/shared';
import path from 'path';

export namespace GameEnv {
    
    const shared = SharedEnv.build();

    // Configuración específica del servicio
    export const PORT = 3003; 
    export const HOST = shared.USER_SERVICE_HOST || 'localhost';
    
    // Rutas y Secretos
    export const DB_PATH = shared.DB_PATH || '../../db-data';
    export const JWT_SECRET = shared.JWT_SECRET;
    export const SERVICE_SECRET = shared.SERVICE_SECRET;
    export const NODE_ENV = shared.NODE_ENV;

    export const serverConfig = {
        port: PORT,
        host: HOST,
        // Usamos una DB separada para aislar el microservicio
        dbPath: path.join(DB_PATH, 'game.db') 
    };

    export function getFastifyConfig() {
        return {
            logger: {
                level: 'info',
                transport: {
                    target: 'pino-pretty',
                    options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' }
                }
            }
        };
    }
}