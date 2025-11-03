import Fastify, { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import { config, getFastifyConfig } from './config';
import { userRoutes } from './routes/user.routes';

/**
 * Crea y configuara la instancia de Fastfy\
 * \
 * @returns instnacia de Fastify configurada, sin listen())
 */
export function buildApp(): FastifyInstance {
	
	// Crear instancia
	const app = Fastify(getFastifyConfig());
	
	// registrar plugins, security headers
	app.register(helmet, {
		contentSecurityPolicy: false,
		crossOriginEmbedderPolicy: false
	});
	
	/**
	 * endpoint de health check
	*/
	app.get('/health', async(request, reply) => {
		return {
			status: 'ok',
			service: 'database-service',
			timestamp: new Date().toISOString(),
			uptime: process.uptime()
		};
	});
	
	/**
	 * Registrar todas las rutas del servicio
	 */
	app.register(userRoutes, { prefix: '/api' });
//	app.register(friendshipRoutes, { prefix: '/api' });
//	app.register(matchRoutes, { previx:'/api' });

	/**
	 * Manejo global de errores\
	 * Captura cualquier error no manejado
	 */
	app.setErrorHandler((error, request, reply) => {
		request.log.error({
			err: error,
			url: request.url,
			method: request.method
		});

		if (error.validation) {
			return reply.status(400).send({
				error: 'Validation Error',
				message: error.message,
				details: error.validation
			})
		}

		if (error.statusCode) {
			return reply.status(error.statusCode).send({
				error: error.name,
				message: error.message
			})
		}

		return reply.status(500).send({
			error: 'Internal server error',
			message: config.nodeEnv === 'production'
				? 'Algo salió mal'
				: error.message
		});
	});

	app.setNotFoundHandler((request, reply) => {
		return reply.status(404).send({
			error: 'Not found',
			message: `Route ${request.method} ${request.url} no encontrada`,
		});
	});

	return app;
}