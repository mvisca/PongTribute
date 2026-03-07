import Fastify, { FastifyInstance } from 'fastify';
import { BotEnv } from './config.js';

export function buildApp(): FastifyInstance {

	const app = Fastify(BotEnv.getFastifyConfig());

	app.addHook('onRoute', (route) => {
		if (route.method.toString() === 'HEAD') return;
		app.log.info(`[ROUTE] ${route.method.toString().padEnd(7)} ${route.url}`);
	});

	app.log.info('App built');
	return app;
}