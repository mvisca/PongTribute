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
			console.log('Redis cliente creado en User service');
		} catch (err) {
			console.error('Error conectando Redis en User: ', err);
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

		console.log(`App log level: ${app.log.level}`);
		console.log(`[USER] Service listo en ${UserEnv.HOST()}:${UserEnv.PORT()}`);
		console.log(`DB Path: ${UserEnv.USER_SERVICE_DB_FULL_PATH()}`);

		// Limpieza de tabla 'refresh_tokens' para development y production
		if (UserEnv.NODE_ENV() !== 'test') {
			const tokenService = new TokenService();
			setInterval(async () => {
				try {
					await tokenService.cleanExpired();
					console.info(`[${Date.now()}] Expired refresh tokens cleaned`);

				} catch(err) {
					console.error(err, 'Error durante la limpieza de refresh tokens expirados');
				}
			}, 1000 * 60 * 60);
		}
	} catch (err) {
		console.log(`ERROR:`, err instanceof Error ? err.message : err);
		console.log('Verifica .env y si no existe ejecuta: "cp .env.example .env"');
		await gracefulShutdown('STARTUP_ERROR');
	}
}

async function gracefulShutdown(signal: string) {
	console.log(`\n${signal} recibido. Iniciando Graceful Shutdown`);

	if (redisClient) {
		try {
			await redisClient.quit();
			console.log('[USER] Redis desconectado');
		} catch (err) {
			console.error('Error cerrando Redis', err);
		}
	}

	if (app) {
		try {
			await app.close();
			console.log('[USER] Fastify HTTP server cerrado');
		} catch (err) {
			console.error('Error cerrando Fastify', err);
		}
	}

	try {
		closeDatabase();
		console.log('[USER] Base de Datos cerrada');
	} catch (err) {
		console.error('Error cerrando DB', err);
	}

	process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

start()
