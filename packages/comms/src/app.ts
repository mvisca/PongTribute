import Fastify, { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import fastifyWebsocket from '@fastify/websocket';
import { CommsEnv } from './config.js';
import { CommsService } from './services/comms.service.js';
import { CommsRoutes } from './routes/index.js';

export interface CommsAppDependencies {
	commsService: CommsService;
}

/** Crea y configura la instancia de Fastify */
export function buildApp(deps: CommsAppDependencies): FastifyInstance {

	// Inicializar Fastify con config
	const app = Fastify(CommsEnv.getFastifyConfig());
	
	// Plugins de seguridad
	app.register(helmet, {
		contentSecurityPolicy: false,
		crossOriginEmbedderPolicy: false
	});
	
	// Pligin de websocket
	app.register(fastifyWebsocket);
	
	// Registro de rutas
	app.register(CommsRoutes.healthRoutes, { ...deps });
	app.register(CommsRoutes.wsRoutes, { prefix: '/api', ...deps });

	/** Manejo global de errores. Captura cualquier error no manejado */
	app.setNotFoundHandler((request, reply) => {
		return reply.status(404).send({
			error: 'Not found',
			message: `Route ${request.method} ${request.url} no encontrada`,
		});
	});

	return app;
}