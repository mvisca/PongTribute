import Fastify, { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import { config, getFastifyConfig } from './config';
import { userRoutes } from './routes/user.publicRoutes';
import { internalRoutes } from './routes/user.internalRoutes';

let currentApp: FastifyInstance | null = null;

process.on('SIGINT', async () => {
	console.log('Fastify Signal Handler: SIGINT received, closing HTTP server...');
	if (currentApp) {
		await currentApp.close();
		currentApp = null;
		console.log('HTTP Server closed')
	}
});

process.on('SIGTERM', async () => {
	console.log('Fastify Signal Handler: SIGTERM received, closing HTTP server...');
	if (currentApp) {
		await currentApp.close();
		currentApp = null;
		console.log('HTTP Server closed')
	}
});

/**
* Crea y configuara la instancia de Fastfy\
* 
* @returns instnacia de Fastify configurada, sin listen())
*/
export function buildApp(): FastifyInstance { 
	
	// Crear instancia
	const app = Fastify(getFastifyConfig());
	currentApp = app;
	
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
			PATCH: 'USER 🔧:',
			HEAD: 'HEAD (--):'
		}[method as string] || '📌';
		console.log(`${icon} ${method.padEnd(7)} ${url}`);
	})
	
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
			status: 'LA APP FUCNIONA OK!',
			service: 'USER SERVICE',
			timestamp: new Date().toISOString(),
			uptime: process.uptime()
		};
	});

	/**
	* Registrar todas las rutas del servicio
	*/
	app.register(userRoutes, { prefix: '/api' });
	app.register(internalRoutes, { prefix: '/internal'});

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
				error: 'Ostras! Error de validación',
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