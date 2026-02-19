// Tu trabajo es CONFIGURAR FASTIFY

import Fastify, { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import fastifyWebsocket from '@fastify/websocket';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { gameRoutes } from './index.js';
import { GameEnv } from './config.js';
import { healthRoutes } from './routes/health.routes.js';
import { Redis } from 'ioredis';
import { SWAGGER_THEME_CSS } from '@transcendence/shared';

export interface GameAppDependencies {
	redisClient: Redis;
}

export function buildApp(deps: GameAppDependencies): FastifyInstance {

	// 1. Inicialización con Configuración (Logger, etc.)
	const app = Fastify(GameEnv.getFastifyConfig());

	// 2. Plugins Globales de Seguridad
	app.register(helmet, {
		contentSecurityPolicy: false,
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
				{ url: `http://localhost:${GameEnv.PORT()}` }
			],
			components: {
				securitySchemes: {
					bearerAuth: {
						type: 'http',
						scheme: 'bearer',
						bearerFormat: 'JWT'
					}
				}
			},
			security: [{ bearerAuth: [] }],
			tags: [
				{ name: 'Game', description: 'Game service' }
			]
		},
		transform: ({ schema, url }) => {
			return { schema, url };
		}
	});

	// Swagger UI (Visual)
	app.register(swaggerUI, {
		routePrefix: '/docs',
		staticCSP: true,
		uiConfig: {
			docExpansion: 'list',
			deepLinking: false
		},
		theme: {
			title: 'Transcendence Game API',
			css: [
				{
					filename: 'swagger-custom.css',
					content: SWAGGER_THEME_CSS
				}
			]
		}
	});

	// REGISTRO DE WEBSOCKETS
	app.register(fastifyWebsocket);

	// Hooks Globales (Logging Visual de Rutas)
	app.addHook('onRoute', (route) => {
		const method = route.method.toString();

		if (method == 'HEAD') return;

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

	// 4. Registro de Rutas
	app.register(healthRoutes, { ...deps });
	console.log('REG GAME ROUTES');
	app.register(gameRoutes, { prefix: '/api' });

	// 6. Manejador de Errores Global
	app.setNotFoundHandler((request, reply) => {
		return reply.status(404).send({
			error: 'Not found',
			message: `Route ${request.method} ${request.url} no encontrada`,
		});
	});

	console.log('Returning App: GAME');
	return app;
}
