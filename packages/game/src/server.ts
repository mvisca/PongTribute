// Tu trabajo es ARRANCAR EL SERVIDOR.

import { buildApp } from './app.js';
import { closeDatabase, getDatabase } from './connection.js';
import { GameEnv } from './config.js';
import { FastifyInstance } from 'fastify';
import { MatchRepository } from './repositories/MatchRepository.js';
import { MatchService } from './services/MatchService.js';
// Importamos Utils para crear conexiones y Redis type
import { Utils } from '@transcendence/shared';
import { Redis } from 'ioredis';


let app: FastifyInstance | null = null;
let appRedisClient: Redis | null = null;  // Cliente Redis de la app (para health, etc.)
let cronRedisClient: Redis | null = null; // Cliente Redis exclusivo para los Crons

async function start() {
	try {
		// Inicializar config
		GameEnv.init();

		// Crear Redis antes de buildApp
		try {
			appRedisClient = Utils.createRedisClient(GameEnv.getRedisConfig());
			console.log('[GAME] Redis client created');
		} catch (err) {
			console.error('[GAME] Error connecting to Redis: ', err);
			process.exit(1);
		}

		// Construir app
		app = buildApp({ redisClient: appRedisClient! });

		// Arrancar el servidor
		await app.listen({
			port: GameEnv.PORT(),
			host: GameEnv.HOST()
		});

		console.log(`[GAME] Log level: ${app.log.level}`);
		console.log(`[GAME] Service ready at http://${GameEnv.HOST()}:${GameEnv.PORT()}`);
		console.log(`[GAME] DB Path: ${GameEnv.GAME_SERVICE_DB_FULL_PATH()}`);

		// ========================================================================
		// CRON JOB: PRUNE QUEUES + PRUNE INVITES
		// ========================================================================

		// Creamos dependencias para el Cron
		const matchRepo = new MatchRepository(getDatabase());

		// CREAMOS CONEXIÓN REDIS (Usando la Factory de Shared)
        const redisConfig = GameEnv.getRedisConfig();
        cronRedisClient = Utils.createRedisClient(redisConfig);

		// Inyectamos dependencias (CUMPLE LA FIRMA: Repo + Redis)
        const matchService = new MatchService(matchRepo, cronRedisClient);

		console.log('[GAME] Starting cron job: Prune Public Queues (every 10s)');

		// Ejecutar cada 10 segundos
		setInterval(() => {
			// Limpia cola de redis cada 90 seg
			matchService.pruneQueues().catch(err => {
				console.error('[GAME] Error in cron PruneQueues:', err);
			});
			// Pone en 'expired' las invitaciones que siguen en 'pending' tras 60 seg
			matchService.prunePrivateInvites().catch(err => {
				console.error('[GAME] Error in cron PrunePrivateInvites:', err);
			});
		}, 10000); // 10 segundos

		// ========================================================================

	} catch (err) {
		console.log(`[GAME] Startup error:`, err instanceof Error ? err.message : err);
		console.log('[GAME] Check .env file - if missing, run: "cp .env.example .env"');
		await gracefulShutdown('STARTUP_ERROR');
	}
}

async function gracefulShutdown(signal: string) {
	console.log(`\n[GAME] ${signal} received. Starting graceful shutdown`);

	// Cerramos el Redis de la App
	if (appRedisClient) {
		try {
			await appRedisClient.quit();
			console.log('[GAME] Redis disconnected');
		} catch (err) {
			console.error('[GAME] Error closing Redis', err);
		}
	}

	// Cerramos el Redis de los Crons (que creamos aquí)
    if (cronRedisClient) {
        try {
            await cronRedisClient.quit();
            console.log('[GAME] Cron Redis disconnected');
        } catch (err) {
            console.error('[GAME] Error closing cron Redis', err);
        }
    }

	if (app) {
		try {
			await app.close();
			console.log('[GAME] Fastify HTTP server closed');
		} catch (err) {
			console.error('[GAME] Error closing Fastify', err);
		}
	}

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
