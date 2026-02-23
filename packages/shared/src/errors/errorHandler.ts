import { FastifyReply } from 'fastify';
import { AppError } from './AppError.js';
import { stat } from 'fs';

/** Handler centralizado de errores */
export function handleError(error: unknown, reply: FastifyReply): void {
	const request = reply.request;
	let context = {};

	if (error instanceof AppError && error.context) {
		context = error.context;
	}

	// Logea el error que procesa
	console.error('[ERROR-HANDLER]', {
		timestamp: new Date().toISOString(),
		error: error instanceof Error ? {
			message: error.message,
			stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
			...(error instanceof AppError ? { type: error.constructor.name } : {}),
		} : error,
		request: {
			method: request.method,
			url: request.url,
			id: request.id,
			userId: request.user?.id
		},
		context
	})

	// Error de la aplicación, conocido y tipado
	if (error instanceof AppError) {
		reply.code(error.statusCode).send(error.toJSON());
		return;
	}
	

	// Errores de Fastify/Plugins con statusCode propio 
	if (error instanceof Error && 'statusCode' in error) {
		const statusCode = (error as any).statusCode as number;
		if (statusCode < 500) {
			reply.code(statusCode).send({
				statusCode,
				error:error.name,
				message: error.message
			});
		}
	}

	// Error del JWT
	if (error instanceof Error && error.name === 'JsonWebTokenError') {
		reply.code(401).send({
			error: 'UnauthorizedError',
			message: 'Token inválido'
		});
		return;
	}
	
	if (error instanceof Error && error.name === 'TokenExpiredError') {
		reply.code(401).send({
			error: 'UnauthorizedError',
			message: 'Token expirado'
		});
		return;
	}
	
	// Error de validación de Fastity
	if (error instanceof Error && 'validation' in error) {
		reply.code(400).send({
			error: 'ValidationError',
			message: error.message,
			details: error.validation
		});
		return;
	}
	
	// Error no conocido
	console.error('[ERROR-HANDLER] Unhandled error (already logged):', error);
	reply.code(500).send({
		error: 'InternalServerError',
		message: 'Error interno del servidor'
	});
}