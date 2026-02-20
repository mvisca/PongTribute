import Fastify, { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import type { Redis } from 'ioredis';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { UserEnv, UserRoutes } from './index.js';
import { UserService } from './services/user.service.js';
import { healthRoutes } from './routes/health.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface UserAppDependencies {
	redisClient: Redis;
	userService: UserService;
}

/** Crea y configuara la instancia de Fastfy */
export function buildApp(deps: UserAppDependencies): FastifyInstance {
	
	/** 1. Crear instancia app */
	const app = Fastify(UserEnv.getFastifyConfig());
	
	/** 1.5.  Rate limitng global */
	app.register(rateLimit, {
		max: 100, // 100 requests
		timeWindow: '1 minute',
		redis: deps.redisClient,
		nameSpace: 'rl:user:',
		skipOnError: true // No bloquear si Redis falla
	});

	/** 2. Plugins de seguridad */
	app.register(helmet, {
		contentSecurityPolicy: false,
		crossOriginEmbedderPolicy: false
	});
	
	/** 2. Plugins de documentación */
	app.register(swagger, {
		openapi: {
			info: {
				title: 'Transcendence User API',
				version: '1.0.0'
			},
			servers: [
				{ url: `http://localhost:${UserEnv.PORT()}`}
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
			security: [{ bearerAuth: [] }], // aplica por defecto a todas las rutas
			tags: [
				{ name: 'User', description: 'Gestión de usuarios' },
				{ name: 'Token', description: 'Gestión de refresh tokens' },
				{ name: 'Friendship', description: 'Gestión de amistades' }
			]
		},
		transform: ({ schema, url }) => {
			return {
				schema,
				url
			};
		}
	});
	
	/** 2. Plugins de documentacion con UI interactiva */
	const swaggerThemeCSS = readFileSync(
		// En runtime compilado, __dirname apunta a dist/src, por eso subimos 3 niveles hasta /packages
		join(__dirname, '../../../shared/src/styles/', 'swagger-custom.css'),
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
			title: 'Transcendence Auth API',
			css: [
				{
					filename: 'placeholder',
					content: swaggerThemeCSS
				}
			]
		}
	});
	
	/** 3. Hooks */
	app.addHook('onRoute', (route) => {
		const method = route.method.toString();

		if (method == 'HEAD')
			return;

		const url = route.url;
		console.log(`[USER] [ROUTE] ${method.padEnd(7)} ${url}`);
	})


	/** Registrar todas las rutas del servicio */
	app.register(healthRoutes, { ...deps });
	app.register(UserRoutes.internalTokenRoutes, { prefix: '/internal', ...deps });
	console.log('[USER] Registering internal token routes');

	app.register(UserRoutes.internalRoutes, { prefix: '/internal', ...deps });
	console.log('[USER] Registering internal routes');

	app.register(UserRoutes.publicRoutes, { prefix: '/api', ...deps });
	console.log('[USER] Registering public routes');

	app.register(UserRoutes.protectedRoutes, { prefix: '/api', ...deps });
	console.log('[USER] Registering protected routes');


	/** Manejo global de errores. Captura cualquier error no manejado */
	app.setNotFoundHandler((request, reply) => {
		return reply.status(404).send({
			error: 'Not found',
			message: `Route ${request.method} ${request.url} no encontrada`,
		});
	});

	console.log('[USER] App ready');
	return app;
}
