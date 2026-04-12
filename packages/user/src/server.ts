import { FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';
import { Utils } from '@transcendence/shared';
import {
	buildApp,
	UserEnv,
	closeDatabase,
	UserService,
	FriendshipService,
	TokenService,
	SQLiteUserRepository,
	SQLiteFriendshipRepository,
	SQLiteTokenRepository
} from './index.js';

let app: FastifyInstance | null = null;
let redisClient: Redis | null = null;

async function start() {
	try {
		// Inicializar config
		UserEnv.init();


		// Redis se crea ANTES de buildApp porque buildApp lo necesita como dep.
		// En este punto app aún no existe, console es el único recurso disponible.
		// 1. Redis — antes de buildApp (necesario para rate-limit plugin)
		try {
			redisClient = Utils.createRedisClient(UserEnv.getRedisConfig());
			console.log('[USER] Redis client created');
		} catch (err) {
			console.error('[USER] Error connecting to Redis: ', err);
			process.exit(1);
		}

		// 2. Crear Repos — sin dependencias de logger
		const userRepo = new SQLiteUserRepository();
		const friendshipRepo = new SQLiteFriendshipRepository();
		const tokenRepo = new SQLiteTokenRepository();

		// Crear services con dependencias inyectadas
		// 3. Services con logger provisional (console) — se actualizará tras buildApp
		// Alternativa más limpia: hacer el logger opcional en el constructor con fallback
		const userService = new UserService(redisClient!, userRepo, friendshipRepo);
		const friendshipService = new FriendshipService(friendshipRepo, userService, redisClient);
		const tokenService = new TokenService(tokenRepo);

		// Construir app con todas las deps
		// 4. buildApp — necesita los services ya construidos
		app = buildApp({ redisClient, userService, friendshipService, tokenService });

		// 6. Listen. Arrancar el servidor
		await app.listen({
			port: UserEnv.PORT(),
			host: UserEnv.HOST()
		});

		// A partir de aquí app existe — usamos app.log para todo
		app.log.info(`[USER] Log level: ${app.log.level}`);
		app.log.info(`[USER] Service ready at ${UserEnv.HOST()}:${UserEnv.PORT()}`);
		app.log.info(`[USER] DB Path: ${UserEnv.USER_SERVICE_DB_FULL_PATH()}`);

		// Limpieza de tabla 'refresh_tokens' para development y production
		if (UserEnv.NODE_ENV() !== 'test') {
			setInterval(async () => {
				try {
					await tokenService.cleanExpired();
					app!.log.info('[USER] Expired refresh tokens cleaned');

				} catch (err) {
					app!.log.error({ err }, '[USER] Error during expired refresh token cleanup');
				}
			}, 1000 * 60 * 60);

			// Limpieza de friendships stale (rejected/pending > 30 días) cada 24h
			setInterval(async () => {
				try {
					const deleted = await friendshipRepo.cleanStale(30);
					if (deleted > 0) {
						app!.log.info({ deleted }, '[USER] Stale friendships cleaned');
					}
				} catch (err) {
					// Si falla, logea error sin crashear
					app!.log.error({ err }, '[USER] Error during stale friendship cleanup');
				}
			}, 1000 * 60 * 60 * 24); // 24 horas
		}
	} catch (err) {
		const msg = err instanceof Error ? err.message : err;
		if (app) {
			app.log.error(err, '[USER] Startup error');
		} else {
			console.error('[USER] Startup error:', msg);
			console.error('[USER] Check .env file - if missing, run: "cp .env.example .env"');
		}
		await gracefulShutdown('STARTUP_ERROR');
	}
}

async function gracefulShutdown(signal: string) {
	// Patrón (log ?? console): si app existe usa Pino, si no usa console como fallback
	const log = app?.log;
	(log ?? console).info(`\n[USER] ${signal} received. Starting graceful shutdown`);


	if (redisClient) {
		try {
			await redisClient.quit();
			(log ?? console).info('[USER] Redis disconnected');
		} catch (err) {
			(log ?? console).error(err, '[USER] Error closing Redis');
		}
	}

	if (app) {
		try {
			await app.close();
			log!.info('[USER] Fastify HTTP server closed');
		} catch (err) {
			log!.error({ err }, '[USER] Error closing Fastify');
		}
	}

	try {
		closeDatabase();
		(log ?? console).info('[USER] Database closed');
	} catch (err) {
		(log ?? console).error(err, '[USER] Error closing DB');
	}

	process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

start()
