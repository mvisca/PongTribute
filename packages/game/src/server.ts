import { buildApp } from './app.js';
import { GameEnv } from './config.js';

async function start() {
    // Construimos la app
    const app = buildApp();

    try {
        // Arrancamos el servidor escuchando en el puerto configurado
        await app.listen({ 
            port: GameEnv.serverConfig.port, 
            host: GameEnv.serverConfig.host 
        });

        console.log(`\nGAME Service listo en http://${GameEnv.serverConfig.host}:${GameEnv.serverConfig.port}`);
        console.log(`DB Path: ${GameEnv.serverConfig.dbPath}\n`);

    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}

// Manejo de cierre elegante (Graceful Shutdown)
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

start();