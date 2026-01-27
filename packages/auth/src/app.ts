import Fastify, { FastifyError, FastifyInstance } from "fastify";
import helmet from '@fastify/helmet';
import type { Redis } from 'ioredis';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { SharedErrors, Utils } from "@transcendence/shared";
import { authRoutes, AuthEnv } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
				{ url: `http://localhost:${AuthEnv.PORT()}`}
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
		const icon = {
			POST: 'AUTH 📝: ',
			GET: 'AUTH 📖:',
			PUT: 'AUTH ✏️:',
			DELETE: 'AUTH 🗑️:',
			PATCH: 'AUTH 🔧:'
		}[method as string] || '📌';
		console.log(`${icon} ${method.padEnd(7)} ${url}`);
	})
	
	/** endpoint de health check mejorado: verifica Redis */
	app.get('/health', async(request, reply) => {
		const checks: Record<string, { status: string; error?: string }> = {};
		let allHealthy = true;

		// Verificar Redis
		if (redisClient) {
			try {
				const redisStatus = await redisClient.ping();
				checks.redis = { status: redisStatus === 'PONG' ? 'ok' : 'unhealthy' };
				if (redisStatus !== 'PONG') allHealthy = false;
			} catch (error: any) {
				checks.redis = { status: 'unreachable', error: error.message };
				allHealthy = false;
			}
		} else {
			checks.redis = { status: 'not_initialized', error: 'Redis client not initialized' };
			allHealthy = false;
		}

		const statusCode = allHealthy ? 200 : 503;
		reply.status(statusCode);

		return {
			status: allHealthy ? 'ok' : 'degraded',
			service: 'AUTH SERVICE',
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			dependencies: checks
		};
	});

	/** Registrar todas las rutas del servicio */	
	console.log('REG AUTH PUBLIC ROUTES');
	app.register(authRoutes, { prefix: '/api' });
	
	/** Manejo global de errores. Captura cualquier error no manejado */
	app.setErrorHandler((error, request, reply) => {		
		SharedErrors.handleError(error, reply);
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