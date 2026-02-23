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
			matchService.pruneQueues().catch(err => console.log('[GAME] Cron pruneQueues error:', err));
			matchService.prunePrivateInvites().catch(err => console.error('[GAME] Cron prunePrivateInvites error:', err));
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

		console.log(`[GAME] Log level: ${app.log.level}`);
		console.log(`[GAME] Service ready at http://${GameEnv.HOST()}:${GameEnv.PORT()}`);
		console.log(`[GAME] DB Path: ${GameEnv.GAME_SERVICE_DB_FULL_PATH()}`);

	} catch (err) {
		console.log(`[GAME] Startup error:`, err instanceof Error ? err.message : err);
		console.log('[GAME] Check .env file - if missing, run: "cp .env.example .env"');
		await gracefulShutdown('STARTUP_ERROR');
	}
}

async function gracefulShutdown(signal: string) {
	console.log(`\n[GAME] ${signal} received. Starting graceful shutdown`);

	// 1. Dejar de disparar crons
	if (cronInterval) {
		clearInterval(cronInterval);
		console.log('[GAME] Cron jobs stopped');
	}

	// 2. Dejar de recibir eventos Redis (disconnect() hace quit() internamente)
	if (eventSubscriber) {
		try {
			await eventSubscriber.disconnect();
			console.log('[GAME] Event subscriber disconnected');
		} catch (err) {
			console.error('[GAME] Error closing event subscriber', err);
		}
	}

	// 3. Cerrar Fastify (deja de aceptar requests HTTP/WS)
	if (app) {
		try {
			await app.close();
			console.log('[GAME] Fastify HTTP server closed');
		} catch (err) {
			console.error('[GAME] Error closing Fastify', err);
		}
	}

	// 4. Cerrar Redis general (ya no hay requests que lo necesiten)
	if (redisClient) {
		try {
			await redisClient.quit();
			console.log('[GAME] Redis disconnected');
		} catch (err) {
			console.error('[GAME] Error closing Redis', err);
		}
	}

	// 5. Cerrar base de datos
	try {
		closeDatabase();
		console.log('[GAME] Database closed');
	} catch (err) {
		console.error('[GAME] Error closing DB', err);
	}

	process.exit(0);
}

// Manejo de cierre elegante (Graceful Shutdown)
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

start();
