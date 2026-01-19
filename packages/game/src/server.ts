import { buildApp } from './app.js';
import { GameEnv } from './config.js';

async function start() {
    try {
        // Inicializar config
        GameEnv.init();

        // Construir app
        const app = buildApp();

        // Arrancar el servidor
        await app.listen({
            port: GameEnv.PORT(),
            host: GameEnv.HOST()
        });

        console.log(`\nGAME Service listo en http://${GameEnv.HOST()}:${GameEnv.PORT()}`);
        console.log(`DB Path: ${GameEnv.GAME_SERVICE_DB_FULL_PATH()}\n`);

    } catch (err) {
        console.log(`ERROR:`, err instanceof Error ? err.message : err);
        console.log('Verifica .env y si no existe ejecuta: "cp .env.example .env"');
        process.exit(1);
    }
}

// Manejo de cierre elegante (Graceful Shutdown)
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

start();