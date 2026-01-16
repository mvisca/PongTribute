import { FastifyReply } from 'fastify';
import { AppError } from './AppError.js';

/** Handler centralizado de errores */
export function handleError(error: unknown, reply: FastifyReply): void {

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

	// Error no conocido
	console.error('Error no controlado:', error);
	reply.code(500).send({
		error: 'IntenralServerError',
		message: 'Error interno del servidor'
	});
}