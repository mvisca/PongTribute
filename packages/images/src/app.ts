import Fastify, { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { SWAGGER_THEME_CSS, SharedErrors } from '@transcendence/shared';
import { ImagesEnv } from './config.js';
import { ImagesAppDependencies } from './types.js';
import { healthRoutes, imageRoutes } from './routes/index.js';

export function buildApp(deps: ImagesAppDependencies): FastifyInstance {
	const app = Fastify(ImagesEnv.getFastifyConfig());

	app.register(helmet, {
		contentSecurityPolicy: false,
		crossOriginEmbedderPolicy: false
	});

	app.register(swagger, {
		openapi: {
			info: {
				title: 'Transcendence Images API',
				version: '1.0.0'
			},
			servers: [
				{ url: `http://localhost:${ImagesEnv.PORT()}` }
			],
			tags: [
				{ name: 'Images', description: 'Internal image operations' },
				{ name: 'Health', description: 'Health checks' }
			]
		},
		transform: ({ schema, url }) => ({ schema, url })
	});

	app.register(swaggerUI, {
		routePrefix: '/docs',
		staticCSP: true,
		uiConfig: {
			docExpansion: 'list',
			deepLinking: false
		},
		theme: {
			title: 'Transcendence Images API',
			css: [
				{
					filename: 'swagger-custom.css',
					content: SWAGGER_THEME_CSS
				}
			]
		}
	});

	app.addHook('onRoute', (route) => {
		const method = route.method.toString();

		if (method === 'HEAD')
			return;

		console.log(`[IMAGES] [ROUTE] ${method.padEnd(7)} ${route.url}`);
	});

	app.register(healthRoutes, { ...deps });
	console.log('[IMAGES] Registering internal image routes');
	app.register(imageRoutes, { prefix: '/internal', ...deps });

	app.setErrorHandler((error, request, reply) => {
    SharedErrors.handleError(error, reply);
	});
	
	app.setNotFoundHandler((request, reply) => {
		return reply.status(404).send({
			error: 'Not found',
			message: `Route ${request.method} ${request.url} no encontrada`,
		});
	});

	console.log('[IMAGES] App ready');
	return app;
}
