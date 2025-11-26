import Fastify, { FastifyError, FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import { UserEnv, UserRoutes } from './index.js';
import dotenv from 'dotenv';

dotenv.config();
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
	const app = Fastify(UserEnv.getFastifyConfig());
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
	console.log('REG INTERNAL');
	app.register(UserRoutes.internalRoutes, { prefix: '/internal'});
	console.log('REG PUBLIC');
	app.register(UserRoutes.publicRoutes, { prefix: '/api' });
	console.log('REG PROTECTED');
	app.register(UserRoutes.protectedRoutes, { prefix: '/api'});

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
		
		// NOTA, esto tiene sentido? por que la condicion como valor del key message?
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
	
	console.log('Returning App');
	return app;
}