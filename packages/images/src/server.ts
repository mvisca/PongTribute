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

		app.log.info(`[IMAGES] Log level: ${app.log.level}`);
		app.log.info(`[IMAGES] Service ready at ${ImagesEnv.HOST()}:${ImagesEnv.PORT()}`);
	} catch (err) {
		// Si app se construyó antes del fallo, usamos su logger
		// Si falló antes de buildApp, no queda otra que console
		const msg = err instanceof Error ? err.message : err;
		if (app) {
			app.log.error(err, '[IMAGES] Startup error');
		} else {
			console.error('[IMAGES] Startup error (before app init):', msg);
		}
		process.exit(1);
	}
}

async function gracefulShutdown(signal: string) {
	const log = app?.log;
	// si log existe lo usa, si no usa console como fallback
	(log ?? console).info(`[IMAGES] ${signal} received. Shutting down...`);

	if (app) {
		try {
			await app.close();
			(log ?? console).info('[IMAGES] Server closed');
		} catch (err) {
			(log ?? console).error(err, '[IMAGES] Error closing server');
		}
	}

	process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

start();
