import { FastifyInstance } from 'fastify';
import { buildApp, UserEnv, closeDatabase } from './index.js';
import { UserService } from './services/user.service.js';
import { TokenService } from './index.js';
import { Utils } from '@transcendence/shared';
import type { Redis } from 'ioredis';

let app: FastifyInstance | null = null;
let redisClient: Redis | null = null;

async function start() {
	try {
		// Inicializar config
		UserEnv.init();

		// Crear Redis antes de buildApp
		try {
			redisClient = Utils.createRedisClient(UserEnv.getRedisConfig());
			console.log('[USER] Redis client created');
		} catch (err) {
			console.error('[USER] Error connecting to Redis: ', err);
			process.exit(1);
		}

		const userService = new UserService(redisClient!);

		// Construir app
		app = buildApp({ redisClient: redisClient!, userService });

		// Arrancar el servidor
		await app.listen({
			port: UserEnv.PORT(),
			host: UserEnv.HOST()
		});

		console.log(`[USER] Log level: ${app.log.level}`);
		console.log(`[USER] Service ready at ${UserEnv.HOST()}:${UserEnv.PORT()}`);
		console.log(`[USER] DB Path: ${UserEnv.USER_SERVICE_DB_FULL_PATH()}`);

		// Limpieza de tabla 'refresh_tokens' para development y production
		if (UserEnv.NODE_ENV() !== 'test') {
			const tokenService = new TokenService();
			setInterval(async () => {
				try {
					await tokenService.cleanExpired();
					console.info(`[USER] Expired refresh tokens cleaned`);

				} catch(err) {
					console.error(err, '[USER] Error during expired refresh token cleanup');
				}
			}, 1000 * 60 * 60);
		}
	} catch (err) {
		console.log(`[USER] Startup error:`, err instanceof Error ? err.message : err);
		console.log('[USER] Check .env file - if missing, run: "cp .env.example .env"');
		await gracefulShutdown('STARTUP_ERROR');
	}
}

async function gracefulShutdown(signal: string) {
	console.log(`\n[USER] ${signal} received. Starting graceful shutdown`);

	if (redisClient) {
		try {
			await redisClient.quit();
			console.log('[USER] Redis disconnected');
		} catch (err) {
			console.error('[USER] Error closing Redis', err);
		}
	}

	if (app) {
		try {
			await app.close();
			console.log('[USER] Fastify HTTP server closed');
		} catch (err) {
			console.error('[USER] Error closing Fastify', err);
		}
	}

	try {
		closeDatabase();
		console.log('[USER] Database closed');
	} catch (err) {
		console.error('[USER] Error closing DB', err);
	}

	process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

start()
