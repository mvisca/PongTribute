import Fastify, { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import fastifyWebsocket from '@fastify/websocket';
import type { Redis } from 'ioredis';
import { CommsEnv } from './config.js';
import { SharedEnv, Utils } from '@transcendence/shared';
import {  CommsService } from './services/comms.service.js';
import { CommsRoutes } from './routes/index.js';

// Cliente Redis de la app Comms
export let redisClient: Redis | null = null;

// Instancia única del servicio de comunicaciones
export let commsService: CommsService | null = null;

/** Crea y configura la instncia de Fastify */
export function buildApp(): FastifyInstance {
	// TODO verificar patter si es igual al de otros servicios, por problema de acoplamiento
	// Lo había resuelto instanciado Redis en server... desacoplando la app de Redis
	try {
		const redisConfig = CommsEnv.getRedisConfig(); // TODO
		redisClient = Utils.createRedisClient(redisConfig);
		console.log('[Comms] Redis cliente creado');
	} catch(err) {
		console.error('[Comms] Error conectado Redis:', err);
		process.exit(1);
	}
	
	// Inicializar Fastify con config
	const app = Fastify(CommsEnv.getFastifyConfig());
	
	// Plugins de seguridad
	app.register(helmet, {
		contentSecurityPolicy: false,
		crossOriginEmbedderPolicy: false
	});
	
	// Pligin de websocket
	app.register(fastifyWebsocket);
	
	// Hooks

	app.addHook('onRoute', (route) => {
		const method = route.method.toString();
		if (method === 'HEAD') return;
		
		const icon = {
			POST: '📤',
			GET: '📖',
			PUT: '✏️',
			DELETE: '🗑️',
			PATCH: '🔧'
		}[method] || '📌';

		console.log(`${icon} COMMS: ${method.padEnd(7)} ${route.url}`);
	});

	// Registro de rutas
	app.register(CommsRoutes.healthRoutes, { redisClient });
	app.register(CommsRoutes.wsRoutes, { prefix: '/api' });

	/** Manejo global de errores. Captura cualquier error no manejado */
	app.setNotFoundHandler((request, reply) => {
		return reply.status(404).send({
			error: 'Not found',
			message: `Route ${request.method} ${request.url} no encontrada`,
		});
	});

	console.log('Returning App: COMMS');
	return app;
}