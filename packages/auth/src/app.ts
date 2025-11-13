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

	app.setErrorHandler((error, request, reply) => {
		request.log.error(error);
		return reply.status(500).send({
			error: 'Internal Server Error',
			message: error.message
		});
	});

	return app; 
}