import { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';
import { ImagesEnv } from './config.js';
import { CloudinaryService } from './services/CloudinaryService.js';

let app: FastifyInstance | null = null;

async function start() {
	try {
		ImagesEnv.init();

		const cloudinaryService = new CloudinaryService();

		app = buildApp({ cloudinaryService });

		await app.listen({
			port: ImagesEnv.PORT(),
			host: ImagesEnv.HOST()
		});

		console.log(`[IMAGES] Log level: ${app.log.level}`);
		console.log(`[IMAGES] Service ready at ${ImagesEnv.HOST()}:${ImagesEnv.PORT()}`);
	} catch (err) {
		console.log(`[IMAGES] Startup error:`, err instanceof Error ? err.message : err);
		console.log('[IMAGES] Check .env file - if missing, run: "cp .env.example .env"');
		await gracefulShutdown('STARTUP_ERROR');
	}
}

async function gracefulShutdown(signal: string) {
	console.log(`\n[IMAGES] ${signal} received. Starting graceful shutdown`);

	if (app) {
		try {
			await app.close();
			console.log('[IMAGES] Fastify HTTP server closed');
		} catch (err) {
			console.error('[IMAGES] Error closing Fastify', err);
		}
	}

	process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

start();
