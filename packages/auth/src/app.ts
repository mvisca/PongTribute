import Fastify, { FastifyError, FastifyInstance } from "fastify";
import helmet from '@fastify/helmet';
import { authRoutes } from './routes/authRoutes';

export function buildApp(): FastifyInstance {
	const app = Fastify({ logger: true });

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
			PATCH: 'AUTH 🔧:',
			HEAD: 'HEAD (>:'
		}[method as string] || '📌';
		console.log(`${icon} ${method.padEnd(7)} ${url}`);
	})

	/**
	* endpoint de health check
	*/
	app.get('/health', async(request, reply) => {
		return {
			status: 'LA APP FUCNIONA OK!',
			service: 'AUTH SERVICE',
			timestamp: new Date().toISOString(),
			uptime: process.uptime()
		};
	});
 
	app.register(authRoutes, { prefix: '/api' }); // TODO el prefix de auth debe ser el mismo que user

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