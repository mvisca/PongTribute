import { FastifyInstance } from 'fastify';
import { Redis } from 'ioredis';
import { Utils } from '@transcendence/shared';
import {
	buildApp,
	GameEnv,
	closeDatabase,
	getDatabase,
	MatchRepository,
	MatchService,
	MatchEventSubscriber,
	GameService
} from './index.js';


let app: FastifyInstance | null = null;
let redisClient: Redis | null = null;
let subscriberRedisClient: Redis | null = null;
let eventSubscriber: MatchEventSubscriber | null = null;
let cronInterval: NodeJS.Timeout | null = null;

async function start() {
	try {
		// Inicializar config
		GameEnv.init();

		// ========================================================================
		// INFRAESTRUCTURA (Redis)
		// ========================================================================

		// Redis se crea ANTES de buildApp — console es el único recurso disponible aquí
		try {
			redisClient = Utils.createRedisClient(GameEnv.getRedisConfig());
			subscriberRedisClient = redisClient.duplicate();
			console.log('[GAME] Redis clients created');
		} catch (err) {
			console.error('[GAME] Error connecting to Redis: ', err);
			process.exit(1);
		}

		// ========================================================================
		// COMPOSITION ROOT — Repos, Services, Subscriber
		// ========================================================================

		const db = getDatabase();
		const matchRepo = new MatchRepository(db);
		const matchService = new MatchService(matchRepo, redisClient);
		const gameService = new GameService(matchRepo, redisClient);
		eventSubscriber = new MatchEventSubscriber(matchService, gameService, subscriberRedisClient);

		// Conectar subscriber antes de buildApp
		await eventSubscriber.connect();

		// ========================================================================
		// CREACION DE CRONS JOBS
		// ========================================================================

		cronInterval = setInterval(() => {
			matchService.pruneQueues().catch(err => app!.log.error({ err }, 'Cron pruneQueues error'));
			matchService.prunePrivateInvites().catch(err => app!.log.error({ err }, 'Cron prunePrivateInvites error'));
		}, 10000);
		console.log('[GAME] Cron jobs started');

		// ========================================================================
		// LIMPIEZA DE ZOMBIES (Al arrancar)
		// ========================================================================

		console.log('[GAME] Checking for zombie matches on startup...');
		await matchRepo.resetZombieMatches()
			.then(count => {
				if (count > 0) console.log(`[GAME] Aborted ${count} orphan zombie matches.`);
				else console.log('[GAME] Database clean: no zombie matches found.');
			})
			.catch(err => console.error('[GAME] Error cleaning zombie matches:', err));

		// ========================================================================
		// CONSTRUIR APP — pasa todos los deps
		// ========================================================================

		app = buildApp({ redisClient: redisClient!, matchService, gameService, eventSubscriber });

		// Arrancar el servidor
		await app.listen({
			port: GameEnv.PORT(),
			host: GameEnv.HOST()
		});

		app.log.info(`[GAME] Log level: ${app.log.level}`);
		app.log.info(`[GAME] Service ready at http://${GameEnv.HOST()}:${GameEnv.PORT()}`);
		app.log.info(`[GAME] DB Path: ${GameEnv.GAME_SERVICE_DB_FULL_PATH()}`);

	} catch (err) {
		const msg = err instanceof Error ? err.message : err;
		if (app) {
			app.log.error(err, '[GAME] Startup error');
		} else {
			console.error('[GAME] Startup error:', msg);
			console.error('[GAME] Check .env file - if missing, run: "cp .env.example .env"');
		}
		await gracefulShutdown('STARTUP_ERROR');
	}
}

async function gracefulShutdown(signal: string) {
	const log = app?.log;
	(log ?? console).info(`\n[GAME] ${signal} received. Starting graceful shutdown`);

	// 1. Dejar de disparar crons
	if (cronInterval) {
		clearInterval(cronInterval);
		(log ?? console).info('[GAME] Cron jobs stopped');
	}

	// 2. Dejar de recibir eventos Redis (disconnect() hace quit() internamente)
	if (eventSubscriber) {
		try {
			await eventSubscriber.disconnect();
			(log ?? console).info('[GAME] Event subscriber disconnected');
		} catch (err) {
			(log ?? console).error(err, '[GAME] Error closing event subscriber');
		}
	}

	// 3. Cerrar Fastify (deja de aceptar requests HTTP/WS)
	if (app) {
		try {
			await app.close();
			log!.info('[GAME] Fastify HTTP server closed');
		} catch (err) {
			log!.error({ err }, '[GAME] Error closing Fastify');
		}
	}

	// 4. Cerrar Redis general (ya no hay requests que lo necesiten)
	if (redisClient) {
		try {
			await redisClient.quit();
			(log ?? console).info('[GAME] Redis disconnected');
		} catch (err) {
			(log ?? console).error(err, '[GAME] Error closing Redis');
		}
	}

	// 5. Cerrar base de datos
	try {
		closeDatabase();
		(log ?? console).info('[GAME] Database closed');
	} catch (err) {
		(log ?? console).error(err, '[GAME] Error closing DB');
	}

	process.exit(0);
}

// Manejo de cierre elegante (Graceful Shutdown)
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

start();
