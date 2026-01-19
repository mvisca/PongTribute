import { FastifyReply } from 'fastify';
import { AppError } from './AppError.js';

/** Handler centralizado de errores */
export function handleError(error: unknown, reply: FastifyReply): void {
	const request = reply.request;

	console.error({
		error: error instanceof Error ? error.message : error,
		path: request.url,
		userId: request.user?.id,
		requestId: request.id
	})

	// Error de la aplicación, conocido y tipado
	if (error instanceof AppError) {
		reply.code(error.statusCode).send(error.toJSON());
		return;
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
	console.error('Error no controlado:', error);
	reply.code(500).send({
		error: 'IntenralServerError',
		message: 'Error interno del servidor'
	});
}