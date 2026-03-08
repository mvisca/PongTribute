import { FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';
import { Utils } from '@transcendence/shared';
import { buildApp } from './app.js';
import { AuthEnv } from './config.js';
import { AuthService } from './services/auth.service.js';
import { TokenCleanupService } from './services/token-cleanup.service.js';
import { MailerService } from './services/mailer.service.js';
import { createMailerClient } from './utils/mailer.js';

let app: FastifyInstance | null = null;
let cleanupService: TokenCleanupService | null = null;
let redisClient: Redis | null = null;
let mailerService: MailerService | null = null;

async function start() {
	try {
		// Inicializar config
		AuthEnv.init();

		// Crear Redis antes de buildApp
		try {
			redisClient = Utils.createRedisClient(AuthEnv.getRedisConfig());
			console.log('[AUTH] Redis client created');
		} catch (err) {
			console.error('[AUTH] Error connecting to Redis: ', err);
			process.exit(1);
		}

		try {
			const mailerTransporter = createMailerClient();
			mailerService = new MailerService(mailerTransporter);
			console.log('[AUTH] Mailer client created');
		} catch (err) {
			console.error('[AUTH] Error connecting to Mailer client: ', err);
			process.exit(1);
		}

		// Crear AuthService con Redis inyectado
		const authService = new AuthService(redisClient, mailerService);

		// Construir app
		app = buildApp({ redisClient, authService, mailerService });

		// Arrancar el servidor
		await app.listen({
			port: AuthEnv.PORT(),
			host: AuthEnv.HOST()
		});

		app.log.info(`[AUTH] Log level: ${app.log.level}`);
		app.log.info(`[AUTH] Service ready at ${AuthEnv.HOST()}:${AuthEnv.PORT()}`);

		cleanupService = new TokenCleanupService();
		cleanupService.start();

	} catch (err) {
		console.log(`[AUTH] Startup error:`, err instanceof Error ? err.message : err);
		console.log('[AUTH] Check .env file - if missing, run: "cp .env.example .env"');
		await gracefulShutdown('STARTUP ERROR');
	}
}

async function gracefulShutdown(signal: string) {
	console.log(`\n[AUTH] ${signal} received. Starting graceful shutdown`);

	if (cleanupService) {
		cleanupService.stop();
		console.log('[AUTH] Cronjob stopped');
	}

	if (redisClient) {
		try {
			await redisClient.quit();
			console.log('[AUTH] Redis disconnected');
		} catch (err) {
			console.error('[AUTH] Error closing Redis', err);
		}
	}

	if (app) {
		try {
			await app.close();
			app.log.info('[AUTH] Fastify HTTP server closed');
		} catch (err) {
			app.log.error({ err }, '[AUTH] Error closing Fastify');
		}
	}

	process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

start();