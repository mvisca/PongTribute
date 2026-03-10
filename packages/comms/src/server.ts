import { FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';
import { Utils } from '@transcendence/shared';
import { buildApp } from './app.js';
import { CommsEnv } from './config.js';
import { CommsService } from './services/comms.service.js';

let app: FastifyInstance | null = null;
let commsService: CommsService | null = null;
let redisClient: Redis | null = null;
let redisSubClient: Redis | null = null;

async function start() {
	try {
		// 1. Inicializar configuración
		CommsEnv.init();

		/// Redis se crea ANTES de buildApp — console es el único recurso disponible aquí
		try {
			redisClient = Utils.createRedisClient(CommsEnv.getRedisConfig());
			redisSubClient = redisClient.duplicate();
			console.log('[Comms] Redis clients created');
		} catch (err) {
			console.error('[Comms] Error creating Redis clients:', err);
			process.exit(1);
		}

		// 3. Inicializar CommsService con las dependencias inyectadas
		commsService = new CommsService(redisClient, redisSubClient);
		await commsService.init();

		// 4. Construir app Fastify, pasando commsService como dependencia
		app = buildApp({ commsService });

		// 5. Arrancar servidor HTTP
		await app.listen({
			port: CommsEnv.PORT(),
			host: CommsEnv.HOST()
		});

		app.log.info(`[Comms] Log level: ${app.log.level}`);
		app.log.info(`[Comms] Service ready at ${CommsEnv.HOST()}:${CommsEnv.PORT()}`);

	} catch (err) {
		const msg = err instanceof Error ? err.message : err;
		if (app) {
			app.log.error(err, '[Comms] Startup error');
		} else {
			console.error('[Comms] Startup error:', msg);
			console.error('[Comms] Check .env file - if missing, run: "cp .env.example .env"');
		}
		await gracefulShutdown('STARTUP_ERROR');
	}
}

async function gracefulShutdown(signal: string) {
	const log = app?.log;
	(log ?? console).info(`\n[Comms] ${signal} received. Shutting down...`);

	// 1. Cerrar servidor HTTP
	if (app) {
		try {
			await app.close();
			log!.info('[Comms] Fastify HTTP server closed');
		} catch (err) {
			log!.error({ err }, '[Comms] Error closing Fastify');
		}
	}
	
	// 2. Cerrar CommsService (WS + Redis internos)
	if (commsService) {
		try {
			await commsService.close();
			(log ?? console).info('[Comms] CommsService closed (Redis included)');
		} catch (err) {
			(log ?? console).error(err, '[Comms] Error closing CommsService');
		}
	}

	process.exit(0);
}

// Manejadores de señales
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Iniciar
start();
