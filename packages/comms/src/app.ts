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

	// Websocket plugin with perMessageDeflate disabled (messasges compresion)
	app.register(fastifyWebsocket, {
		options: {
			perMessageDeflate: false
		}
	});

	// Hooks
	app.addHook('onRoute', (route) => {
		const method = route.method.toString();
		if (method === 'HEAD') return;

		const icon = {
			POST: '📤',
			GET: '📖',
			PUT: '✏️',
			DELETE: '🗑️',
			PATCH: '🔧'
		}[method] || '📌';

		app.log.info(`${icon} COMMS: ${method.padEnd(7)} ${route.url}`);
	});

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

	app.log.info('[Comms] App ready');
	return app;
}