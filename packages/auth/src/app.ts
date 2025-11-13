import Fastify, { FastifyInstance } from "fastify";
import helmet from '@fastify/helmet';
import { authRoutes } from './routes/authRoutes';

export function buildApp(): FastifyInstance {
	const app = Fastify({ logger: true });

	app.register(helmet,{
		contentSecurityPolicy: false,
		crossOriginEmbedderPolicy: false
	});

	app.register(authRoutes, { prefix: '/api' }); // TODO el prefix de auth debe ser el mismo que user

	/**
	* endpoint de health check
	*/
	app.get('/health', async(request, reply) => {
		return {
			status: 'LA APP FUCNIONA OK!',
			service: 'database-service',
			timestamp: new Date().toISOString(),
			uptime: process.uptime()
		};
	});
	app.setErrorHandler((error, request, reply) => {
		request.log.error(error);
		return reply.status(500).send({
			error: 'Internal Server Error',
			message: error.message
		});
	});

	return app; 
}