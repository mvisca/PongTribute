// Tu trabajo es CONFIGURAR FASTIFY

import Fastify, { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import fastifyWebsocket from '@fastify/websocket';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { gameRoutes } from './routes/game.routes.js';
import { GameEnv } from './config.js';
import { healthRoutes } from './routes/health.routes.js';
import { SWAGGER_THEME_CSS } from '@transcendence/shared';
import { GameAppDependencies } from './types.js';

export function buildApp(
	deps: GameAppDependencies
): FastifyInstance {

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
	app.register(fastifyWebsocket, {
		options:
		{ perMessageDeflate: false } // Disabels default ws message compression
	});

	// Hooks Globales (Logging Visual de Rutas)
	app.addHook('onRoute', (route) => {
		const method = route.method.toString();

		if (method == 'HEAD') return;

		const url = route.url;
		app.log.info({ method, url }, '[GAME] Route registered');
	});

	// 4. Registro de Rutas
	app.register(healthRoutes, { ...deps });
	app.log.info('[GAME] Registering game routes');
	app.register(gameRoutes, { prefix: '/api', ...deps });

	// 6. Manejador de Errores Global
	app.setNotFoundHandler((request, reply) => {
		return reply.status(404).send({
			error: 'Not found',
			message: `Route ${request.method} ${request.url} no encontrada`,
		});
	});

	app.log.info('[GAME] App ready');
	return app;
}
