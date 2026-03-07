import { Redis } from 'ioredis';
import { Utils } from '@transcendence/shared';
import { BotEnv } from './config.js';
import { buildApp } from './app.js';
import { BotService } from './services/BotService.js';
import { BotController } from './controllers/BotController.js';
import { RedisSubscriber } from './subscribers/RedisSubscriber.js';


let app: ReturnType<typeof buildApp> | null = null;
let subscriberRedisClient: Redis | null = null;
let redisSubscriber: RedisSubscriber | null = null;

async function start() {
	try {
		// ── 1. Configuración ─────────────────────────────────────────────
		BotEnv.init();

		// ── 2. Servidor HTTP  ────────────────────────────────────────────
		// Se construye primero para disponer de app.log (Pino) en todos
		// los componentes del composition root.
		app = buildApp();
		const log = app.log;

		// ── 3. Redis ─────────────────────────────────────────────────────
		try {
			subscriberRedisClient = Utils.createRedisClient(BotEnv.getRedisConfig());
			log.info('Redis subscriber client created');
		} catch (err) {
			log.error(err, 'Error connecting to Redis');
			process.exit(1);
		}

		// ── 4. Composition root ──────────────────────────────────────────
		const botService = new BotService(log);
		const botController = new BotController(botService, log);
		redisSubscriber = new RedisSubscriber(subscriberRedisClient, botController, log);

		// ── 5. Health check ──────────────────────────────────────────────
		// Registrado después de crear redisSubscriber para que /health
		// refleje el estado real de la conexión Redis.
		app.get('/health', async (_req, reply) => {
			const redisOk = redisSubscriber!.isConnected();
			return reply.status(redisOk ? 200 : 503).send({
				status: redisOk ? 'ok' : 'degraded',
				service: 'bot',
				redis: redisOk,
			});
		});

		// ── 6. Suscripción Redis ─────────────────────────────────────────
		await redisSubscriber.connect();

		// ── 7. Listen ────────────────────────────────────────────────────
		await app.listen({
			port: BotEnv.PORT(),
			host: BotEnv.HOST(),
		});

		log.info(`Service ready at http://${BotEnv.HOST()}:${BotEnv.PORT()}`);
		log.info('Listening for MATCH_BOT_REQUESTED events...');
		log.info({ wsUrl: BotEnv.GAME_WS_URL() }, 'Game WS endpoint configured');

	} catch (err) {
		const msg = err instanceof Error ? err.message : err;
		if (app) {
			app.log.error(msg, 'Startup error');
			app.log.info('Check .env file - if missing, run: "cp .env.example .env"');
		} else {
			console.error('[BOT] Startup error:', msg);
		}
		await gracefulShutdown('STARTUP_ERROR');
	}
}

async function gracefulShutdown(signal: string) {
	const log = app?.log;
	(log ?? console).info(`${signal} received. Starting graceful shutdown`);

	// 1. Dejar de recibir eventos Redis
	if (redisSubscriber) {
		try {
			await redisSubscriber.disconnect();
			(log ?? console).info('Redis subscriber disconnected');
		} catch (err) {
			(log ?? console).error(err, 'Error closing Redis subscriber');
		}
	}

	// 2. Cerrar HTTP
	if (app) {
		try {
			await app.close();
			(log ?? console).info('Fastify server closed');
		} catch (err) {
			(log ?? console).error(err, 'Error closing Fastify');
		}
	}

	process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

start();