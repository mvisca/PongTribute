import Fastify, { FastifyInstance, FastifyError } from 'fastify';
import helmet from '@fastify/helmet';
import fastifyWebsocket from '@fastify/websocket';
import type { Redis } from 'ioredis';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { gameRoutes } from './index.js';
import { GameEnv } from './config.js';
import { Utils } from '@transcendence/shared';

// Cliente Redis de toda la app Game
export let redisClient: Redis | null = null;

export function buildApp(): FastifyInstance {

	try {
		const redisConfig = GameEnv.getRedisConfig();
		redisClient = Utils.createRedisClient(redisConfig);
		console.log('Redis cliente creado en Game service');
	} catch (err) {
		console.error('Error conectando Redis en Game: ', err);
		process.exit(1);
	}

	// 1. Inicialización con Configuración (Logger, etc.)
	const app = Fastify(GameEnv.getFastifyConfig());

	// 2. Plugins Globales de Seguridad
	app.register(helmet, {
		contentSecurityPolicy: false, // Ajustar según necesidad del juego
		crossOriginEmbedderPolicy: false
	});

	// 2. Plugins de documentación
	app.register(swagger, {
		openapi: {
			info: {
				title: 'Transcendence Game API',
				version: '1.0.0'
			},
			servers: [
				{ url: `http://localhost:${GameEnv.PORT}` }
			],
			tags: [
				{ name: 'Game', description: 'Gestión de partidas' }
			]
		},
		transform: ({ schema, url }: { schema: any, url: string }) => {
			return {
				schema,
				url
			};
		}
	});

	// 2. Plugins de documentacion con UI interactiva
	app.register(swaggerUI, {
		routePrefix: '/docs',
		staticCSP: true,
		uiConfig: {
			docExpansion: 'list',
			deepLinking: false
		}
	});

	// 2.1. REGISTRO DE WEBSOCKETS
	// Esto habilita ws:// en tu servidor
	app.register(fastifyWebsocket);

	// 3. Hooks Globales (Logging de peticiones)
	app.addHook('onRoute', (route) => {
		const method = route.method.toString();

		if (method == 'HEAD')
			return;

		const url = route.url;
		const icon = {
			POST: 'GAME 📝: ',
			GET: 'GAME 📖:',
			PUT: 'GAME ✏️:',
			DELETE: 'GAME 🗑️:',
			PATCH: 'GAME 🔧:'
		}[method as string] || '📌';
		console.log(`${icon} ${method.padEnd(7)} ${url}`);
	});

	// 4. Health Check (Vital para Docker/K8s)
	app.get('/health', async (request, reply) => {
		return {
			status: 'LA APP FUCNIONA OK!',
			service: 'GAME SERVICE',
			timestamp: new Date().toISOString(),
			uptime: process.uptime()
		};
	});

	// 5. Registro de Rutas del Dominio
	// Prefijo '/api' para que quede como: POST /api/matches
	console.log('REG GAME ROUTES');
	app.register(gameRoutes, { prefix: '/api' });

	// 6. Manejador de Errores Global
	app.setErrorHandler((error, request, reply) => {
		request.log.error({
			err: error,
			url: request.url,
			method: request.method
		});

		const typedError = error as FastifyError;

		if ('validation' in typedError && typedError.validation) {
			return reply.status(400).send({
				error: 'Ostras! Error de validación',
				message: typedError.message,
				details: typedError.validation
			})
		}

		if (typedError.statusCode) {
			return reply.status(typedError.statusCode).send({
				error: typedError.name,
				message: typedError.message
			})
		}

		return reply.status(500).send({
			error: 'Internal server error',
			message: GameEnv.NODE_ENV === 'production'
				? 'Algo salió mal'
				: (error as FastifyError).message
		});
	});

	app.setNotFoundHandler((request, reply) => {
		return reply.status(404).send({
			error: 'Not found',
			message: `Route ${request.method} ${request.url} no encontrada`,
		});
	});

	console.log('Returning App: GAME');
	return app;
}