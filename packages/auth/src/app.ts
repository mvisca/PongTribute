import Fastify, { FastifyError, FastifyInstance } from "fastify";
import helmet from '@fastify/helmet';
import type { Redis } from 'ioredis';
import { Utils } from "@transcendence/shared/";
import { authRoutes, AuthEnv } from './index.js';

export let redisClient: Redis | null = null; // Cliente Redis de toda la app

export function buildApp(): FastifyInstance {
	try {
		const redisConfig = AuthEnv.getRedisConfig();
		redisClient = Utils.RedisFactory.createRedisClient(redisConfig); // Instancia de Redis antes de iniciar servidor
		console.log('Redis Client creado!');
	} catch(err){
		console.error('Fallo creando Redis: ', err);
		process.exit(1);
	}

	const app = Fastify(AuthEnv.getFastifyConfig());

	app.register(helmet, {
		contentSecurityPolicy: false,
		crossOriginEmbedderPolicy: false
	});

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
 
	app.register(authRoutes, { prefix: '/api' });

	app.setErrorHandler((error, request, reply) => {
		request.log.error(error);
		return reply.status(500).send({
			error: 'Internal Server Error',
			message: (error as FastifyError).message // TODO evaluar soluciones
			// OPCIONES:
			// a Configurar pnpm para deduplicar 
			// b Type Asertion (implementado) 
			// c Mover FastifyInstance a peer dependencies (entenderlo mejor)
			// d Reexportar tipos desde shared
			// FIN: Solucion definitiva, migrar testUtils a package seapando test a su modulo
		});
	});

	return app; 
}