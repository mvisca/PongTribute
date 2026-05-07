import { FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';
import { Utils } from '@transcendence/shared';
import { buildApp } from './app.js';
import { AuthEnv } from './config.js';
import { AuthService } from './services/auth.service.js';
import { OAuthService } from './services/oauth.service.js';
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

		// Redis y Mailer se crean ANTES de buildApp — console es el único recurso disponible aquí
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
		// Services construidos antes de buildApp (buildApp los necesita como deps)
		const authService = new AuthService(redisClient, mailerService);
		const oauthService = new OAuthService(redisClient, authService);

		// Construir app
		app = buildApp({ redisClient, authService, oauthService, mailerService });

		// Arrancar el servidor
		await app.listen({
			port: AuthEnv.PORT(),
			host: AuthEnv.HOST()
		});

		app.log.info(`[AUTH] Log level: ${app.log.level}`);
		app.log.info(`[AUTH] Service ready at ${AuthEnv.HOST()}:${AuthEnv.PORT()}`);

		// TokenCleanupService se crea DESPUÉS de app — recibe app.log directo
		cleanupService = new TokenCleanupService();
		cleanupService.start();

	} catch (err) {
		const msg = err instanceof Error ? err.message : err;
		if (app) {
			app.log.error(err, '[AUTH] Startup error');
		} else {
			console.error('[AUTH] Startup error:', msg);
			console.error('[AUTH] Check .env file - if missing, run: "cp .env.example .env"');
		}
		await gracefulShutdown('STARTUP_ERROR');
	}
}

async function gracefulShutdown(signal: string) {
	const log = app?.log;
	(log ?? console).info(`\n[AUTH] ${signal} received. Starting graceful shutdown`);

	if (cleanupService) {
		cleanupService.stop();
		(log ?? console).info('[AUTH] Cronjob stopped');
	}

	if (redisClient) {
		try {
			await redisClient.quit();
			(log ?? console).info('[AUTH] Redis disconnected');
		} catch (err) {
			(log ?? console).error(err, '[AUTH] Error closing Redis');
		}
	}

	if (app) {
		try {
			await app.close();
			log!.info('[AUTH] Fastify HTTP server closed');
		} catch (err) {
			log!.error({ err }, '[AUTH] Error closing Fastify');
		}
	}

	process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

start();