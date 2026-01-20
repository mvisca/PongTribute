import Fastify, { FastifyError, FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import type { Redis } from 'ioredis';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { UserEnv, UserRoutes, UserService, AuthMiddleware } from './index.js';
import { Utils } from '@transcendence/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cliente Redis de toda la app User
export let redisClient: Redis | null = null;

/** Crea y configuara la instancia de Fastfy */
export function buildApp(): FastifyInstance { 
	
	try {
		const redisConfig = UserEnv.getRedisConfig();
		redisClient = Utils.createRedisClient(redisConfig);
		console.log('Redis cliente creado en User service');
	} catch (err) {
		console.error('Error conectando Redis en User: ', err);
		process.exit(1);
	}
	
	/** 1. Crear instancia app */
	const app = Fastify(UserEnv.getFastifyConfig());
	
	/** 1.1 Inicializar UserService e inyectarlo en middleware */
	const userService = new UserService();
	AuthMiddleware.setUserService(userService);
	console.log('UserService inyectado en AuthMiddleware');
	
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
	/** 2. Plugins de documentacion con UI interactiva */
	const swaggerThemeCSS = readFileSync(
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
		const icon = {
			POST: 'USER 📝: ',
			GET: 'USER 📖:',
			PUT: 'USER ✏️:',
			DELETE: 'USER 🗑️:',
			PATCH: 'USER 🔧:'
		}[method as string] || '📌';
		console.log(`${icon} ${method.padEnd(7)} ${url}`);
	})
	
	
	/** endpoint de health check */
	app.get('/health', async(request, reply) => {
		return {
			status: 'LA APP FUCNIONA OK!',
			service: 'USER SERVICE',
			timestamp: new Date().toISOString(),
			uptime: process.uptime()
		};
	});
	
	/** Registrar todas las rutas del servicio */
	app.register(UserRoutes.internalTokenRoutes, { prefix: '/internal'});
	console.log('REG TOKEN PROTECTED ROUTES');
	
	app.register(UserRoutes.internalRoutes, { prefix: '/internal'});
	console.log('REG USER INTERNAL ROUTES');
	
	app.register(UserRoutes.publicRoutes, { prefix: '/api' });
	console.log('REG USER PUBLIC ROUTES');
	
	app.register(UserRoutes.protectedRoutes, { prefix: '/api'});
	console.log('REG USER PROTECTED ROUTES');
	
	
	/** Manejo global de errores. Captura cualquier error no manejado */
	app.setNotFoundHandler((request, reply) => {
		return reply.status(404).send({
			error: 'Not found',
			message: `Route ${request.method} ${request.url} no encontrada`,
		});
	});
	
	app.setNotFoundHandler((request, reply) => {
		return reply.status(404).send({
			error: 'Not found',
			message: `Route ${request.method} ${request.url} no encontrada`,
		});
	});
	
	console.log('Returning App: USER');
	return app;
}