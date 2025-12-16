import Fastify, { FastifyError, FastifyInstance } from "fastify";
import helmet from '@fastify/helmet';
import type { Redis } from 'ioredis';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { Utils } from "@transcendence/shared/";
import { authRoutes, AuthEnv } from './index.js';

// Cliente Redis de toda la app Auth
export let redisClient: Redis | null = null; 

/** Crea y configuara la instancia de Fastfy */
export function buildApp(): FastifyInstance {
	
	try {
		const redisConfig = AuthEnv.getRedisConfig();
		redisClient = Utils.createRedisClient(redisConfig);
		console.log('Redis cliente creado en Auth service');
	} catch (err) {
		console.error('Error conectando Redis en Auth: ', err);
		process.exit(1);
	}
	
	/** 1. Crear instancia de app fastify */
	const app = Fastify(AuthEnv.getFastifyConfig());
	
	/** 2. Plugin de seguridad */
	app.register(helmet, {
		contentSecurityPolicy: false,
		crossOriginEmbedderPolicy: false
	});

	/** 2. Plugins de documentación */
	app.register(swagger, {
		openapi: {
			info: {
				title: 'Transcendence Auth API',
				version: '1.0.0'
			},
			servers: [
				{ url: `http://localhost:${AuthEnv.PORT}`}
			],
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

	/** 2. Plugins de documentacion con UI interactiva */
	app.register(swaggerUI, {
		routePrefix: '/docs',
		staticCSP: true,
		uiConfig: {
			docExpansion: 'list',
			deepLinking: false
		}
	});

	/** 3. Hooks */
	app.addHook('onRoute', (route) => {
		const method = route.method.toString();
		
		if (method == 'HEAD')
			return;
		
		const url = route.url;
		const icon = {
			POST: 'AUTH 📝: ',
			GET: 'AUTH 📖:',
			PUT: 'AUTH ✏️:',
			DELETE: 'AUTH 🗑️:',
			PATCH: 'AUTH 🔧:'
		}[method as string] || '📌';
		console.log(`${icon} ${method.padEnd(7)} ${url}`);
	})
	
	/** endpoint de health check */
	app.get('/health', async(request, reply) => {
		return {
			status: 'LA APP FUCNIONA OK!',
			service: 'AUTH SERVICE',
			timestamp: new Date().toISOString(),
			uptime: process.uptime()
		};
	});

	/** Registrar todas las rutas del servicio */	
	console.log('REG AUTH PUBLIC ROUTES');
	app.register(authRoutes, { prefix: '/api' });
	
	/** Manejo global de errores. Captura cualquier error no manejado */
	app.setErrorHandler((error, request, reply) => {
		request.log.error({
			err: error,
			url: request.url,
			method: request.method
		});
		
		if ((error as FastifyError).validation) {
			return reply.status(400).send({
				error: 'Ostras! Error de validación',
				message: (error as FastifyError).message,
				details: (error as FastifyError).validation
			})
		}
		
		const statusCode = (error as FastifyError).statusCode; // TODO arreglar este apanyo causado por type asertion para resolver conflicto de tipo Fastify Error
		if (statusCode) {
			return reply.status(statusCode).send({
				error: (error as FastifyError).name,
				message: (error as FastifyError).message
			})
		}
		
		return reply.status(500).send({
			error: 'Internal server error',
			message: AuthEnv.NODE_ENV === 'production'
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
	
	console.log('Returning App: AUTH');
	return app; 
}