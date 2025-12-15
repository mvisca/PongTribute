import { FastifyInstance } from 'fastify';
import { buildApp, redisClient } from './app.js';
import { AuthEnv } from './config.js';

let app: FastifyInstance |null = null;

async function start() {
	try {
		app = buildApp();
	} catch (err) {
		console.log('Error al lanzar:', err);
		process.exit(1);
	}

	try {
		await app.listen({ port: AuthEnv.PORT, host: AuthEnv.HOST });
		console.log(`Auth service activo en puerto ${AuthEnv.PORT}`);
	} catch (err) {
		app.log.error(err);
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