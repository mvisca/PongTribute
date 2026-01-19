import { FastifyInstance } from 'fastify';
import { buildApp, redisClient } from './app.js';
import { AuthEnv } from './config.js';

let app: FastifyInstance | null = null;

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

		console.log(`Auth en ${AuthEnv.HOST()}:${AuthEnv.PORT}`);

	} catch (err) {
		console.log(`ERROR:`, err instanceof Error ? err.message : err);
		console.log('Verifica .env y si no existe ejecuta: "cp .env.example .env"');
		process.exit(1);
	}
}

async function gracefulShutdown(signal: string) {
	console.log(`\n${signal} recibido. Iniciando Graceful Shutdown`);

	if (redisClient) {
		try {
			await redisClient.quit();
			console.log('AUTH: Redis desconectado');
		} catch (err) {
			console.error('AUTH: Error cerrando Redis', err);
		}
	}

	if (app) {
		try {
			await app.close();
			console.log('AUTH: Fastify HTTP server cerrado')
		} catch (err) {
			console.error('AUTH: Error cerrando Fastify', err);
		}
	}

	process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

start();