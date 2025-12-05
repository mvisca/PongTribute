import Fastify, { FastifyError, FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import type { Redis } from 'ioredis';
import { UserEnv, UserRoutes } from './index.js';
import { Utils } from '@transcendence/shared';

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
	
	/** 2. Plugin de seguridad */
	app.register(helmet, {
		contentSecurityPolicy: false,
		crossOriginEmbedderPolicy: false
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
	console.log('REG USER INTERNAL ROUTES');
	app.register(UserRoutes.internalRoutes, { prefix: '/internal'});
	console.log('REG USER PUBLIC ROUTES');
	app.register(UserRoutes.publicRoutes, { prefix: '/api' });
	console.log('REG USER PROTECTED ROUTES');
	app.register(UserRoutes.protectedRoutes, { prefix: '/api'});
	console.log('REG TOKEN PROTECTED ROUTES');
	app.register(UserRoutes.internalTokenRoutes, { prefix: '/api'});

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
			message: UserEnv.NODE_ENV === 'production'
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
	
	console.log('Returning App: USER');
	return app;
}