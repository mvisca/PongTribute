import Fastify, { FastifyInstance } from "fastify";
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { Redis } from 'ioredis';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { SharedErrors, SWAGGER_THEME_CSS } from "@transcendence/shared";
import { AuthService } from './services/auth.service.js';
import { MailerService } from "./services/mailer.service.js";
import { authRoutes, AuthEnv } from './index.js';
import { healthRoutes } from './routes/health.routes.js';

export interface AuthAppDependencies {
	redisClient: Redis;
	authService: AuthService;
	mailerService: MailerService;
}

/** Crea y configuara la instancia de Fastfy */
export function buildApp(deps: AuthAppDependencies): FastifyInstance {

	/** 1. Crear instancia de app fastify */
	const app = Fastify(AuthEnv.getFastifyConfig());

	/** 1.5.  Rate limitng global */
	app.register(rateLimit, {
		max: 100, // 100 requests
		timeWindow: '1 minute',
		redis: deps.redisClient,
		nameSpace: 'rl:auth:',
		skipOnError: true // No bloquear si Redis falla
	});

	/** 2. Plugin de seguridad */
	app.register(helmet, {
		contentSecurityPolicy: false,
		crossOriginEmbedderPolicy: false
	});

	/** 3. Plugins de documentación */
	app.register(swagger, {
		openapi: {
			info: {
				title: 'Transcendence Auth API',
				version: '1.0.0'
			},
			servers: [
				{ url: `http://localhost:${AuthEnv.PORT()}` }
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
				{ name: 'Auth', description: 'Authentication and authorization' },
				{ name: '2FA', description: '2-Factor Authentication management' }
			]
		},
		transform: ({ schema, url }) => {
			return {
				schema,
				url
			};
		}
	});

	/** 4. Plugins de documentacion con UI interactiva */
	const swaggerThemeCSS = SWAGGER_THEME_CSS;

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

	/** 5. Hooks */
	app.addHook('onRoute', (route) => {
		const method = route.method.toString();

		if (method == 'HEAD')
			return;

		const url = route.url;
		console.log(`[AUTH] [ROUTE] ${method.padEnd(7)} ${url}`);
	})

	/** 6. Registrar todas las rutas del servicio */
	app.register(healthRoutes, { ...deps });
	console.log('[AUTH] Registering public routes');
	app.register(authRoutes, { prefix: '/api', ...deps });

	/** 7. Manejo global de errores. Captura cualquier error no manejado */
	app.setErrorHandler((error, request, reply) => {
		SharedErrors.handleError(error, reply);
	});

	app.setNotFoundHandler((request, reply) => {
		return reply.status(404).send({
			error: 'Not found',
			message: `Route ${request.method} ${request.url} no encontrada`,
		});
	});

	console.log('[AUTH] App ready');
	return app;
}