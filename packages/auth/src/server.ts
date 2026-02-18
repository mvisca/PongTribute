import { FastifyInstance } from 'fastify';
import { buildApp, redisClient } from './app.js';
import { AuthEnv } from './config.js';
import { TokenCleanupService } from './services/token-cleanup.service.js';
import { TLowercase } from '@sinclair/typebox';

let app: FastifyInstance | null = null;
let cleanupService: TokenCleanupService | null = null;

async function start() {
	try {
		// Inicializar config
		AuthEnv.init();
		
		// Construir app
		app = buildApp();

		// Arrancar el servidor
		await app.listen({
			port: AuthEnv.PORT(),
			host: AuthEnv.HOST()
		});

		console.log(`App log level: ${app.log.level}`);
		console.log(`[AUTH] Service listo en ${AuthEnv.HOST()}:${AuthEnv.PORT()}`);

		cleanupService = new TokenCleanupService();
		cleanupService.start();

	} catch (err) {
		console.log(`ERROR:`, err instanceof Error ? err.message : err);
		console.log('Verifica .env y si no existe ejecuta: "cp .env.example .env"');
		await gracefulShutdown('STARTUP ERROR');
	}
}

async function gracefulShutdown(signal: string) {
	console.log(`\n${signal} recibido. Iniciando Graceful Shutdown`);

	if (cleanupService) {
		cleanupService.stop();
		console.log('[AUTH]: Cronjob detenido');
	}

	if (redisClient) {
		try {
			await redisClient.quit();
			console.log('[AUTH]: Redis desconectado');
		} catch (err) {
			console.error('[AUTH]: Error cerrando Redis', err);
		}
	}

	if (app) {
		try {
			await app.close();
			console.log('[AUTH]: Fastify HTTP server cerrado')
		} catch (err) {
			console.error('[AUTH]: Error cerrando Fastify', err);
		}
	}

	process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

start();