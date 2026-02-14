// Tu trabajo es CONFIGURAR FASTIFY

import Fastify, { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import fastifyWebsocket from '@fastify/websocket';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { gameRoutes } from './index.js';
import { GameEnv } from './config.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';


export function buildApp(): FastifyInstance {
	
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = dirname(__filename);
	
	// Inicialización de Fastify
	const app = Fastify(GameEnv.getFastifyConfig());
	
	// Plugins Globales de Seguridad
	app.register(helmet, {
		contentSecurityPolicy: false,
		crossOriginEmbedderPolicy: false
	});
	
	// Plugins de documentación (Swagger)
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

	// Estilos Swagger Custom
	const swaggerThemeCSS = readFileSync(
		// En runtime compilado, __dirname apunta a dist/, por eso subimos 2 niveles hasta /packages
		join(__dirname, '../../shared/src/styles/', 'swagger-custom.css'),
		'utf-8'
	);
	
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
					content: swaggerThemeCSS
				}
			]
		}
	});
	
	
	// REGISTRO DE WEBSOCKETS
	// Esto habilita ws:// en el servidor
	app.register(fastifyWebsocket);
	
	// Hooks Globales (Logging Visual de Rutas)
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

	// REGISTRO DE RUTAS PRINCIPAL (Composition Root)
	// Health Check ahora vive DENTRO de gameRoutes para acceder a Redis
	console.log('REG GAME ROUTES');
	app.register(gameRoutes, { prefix: '/api' });
	
	// Manejador de Errores 404
	app.setNotFoundHandler((request, reply) => {
		return reply.status(404).send({
			error: 'Not found',
			message: `Route ${request.method} ${request.url} no encontrada`,
		});
	});
	
	console.log('Returning App: GAME');
	return app;
}