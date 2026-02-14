// Tu trabajo es ARRANCAR EL SERVIDOR.

import { buildApp } from './app.js';
import { closeDatabase } from './connection.js';
import { GameEnv } from './config.js';
import { FastifyInstance } from 'fastify'; 

let app: FastifyInstance | null = null;

async function start() {
	try {
		// Inicializar config
		GameEnv.init();
		
		// Construir app
		app = buildApp();
		
		// Arrancar el servidor
		await app.listen({
			port: GameEnv.PORT(),
			host: GameEnv.HOST()
		});
		
		console.log(`App log level: ${app.log.level}`);
		console.log(`\nGAME Service listo en http://${GameEnv.HOST()}:${GameEnv.PORT()}`);
		console.log(`DB Path: ${GameEnv.GAME_SERVICE_DB_FULL_PATH()}\n`);
		
	} catch (err) {
		console.log(`ERROR:`, err instanceof Error ? err.message : err);
		console.log('Verifica .env y si no existe ejecuta: "cp .env.example .env"');
		await gracefulShutdown('STARTUP_ERROR');
	}
}

async function gracefulShutdown(signal: string) {
	console.log(`\n${signal} recibido. Iniciando Graceful Shutdown`);
	
	// Cerramos Fastify (esto disparará el hook 'onClose' en game.routes.ts)
    // que a su vez cerrará el Redis y los Cron Jobs.
	if (app) {
		try {
			await app.close();
			console.log('USER: Fastify HTTP server cerrado');
		} catch (err) {
			console.error('Error cerrando Fastify', err);
		}
	}
	
	try {
		closeDatabase();
		console.log('USER: Base de Datos cerrada');
	} catch (err) {
		console.error('Error cerrando DB', err);
	}
	
	process.exit(0);
}

// Manejo de cierre elegante (Graceful Shutdown)
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

start();