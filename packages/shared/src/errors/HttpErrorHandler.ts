import { FastifyReply } from 'fastify';
import { UnauthorizedError } from './UnauthorizedError.js';
import { NotFoundError } from './NotFoundError.js';
import { ConflictError } from './ConflictErrors.js';
import { ValidationError } from './ValidationError.js';

/**
 * Maneja errores de autenticación en middlewares y los convierte en respuestas HTTP 401
 * Específico para middlewares de autenticación donde todos los errores deben ser 401
 */
export const handleAuthError = (err: unknown, reply: FastifyReply): void => {
	if (err instanceof UnauthorizedError) {
		reply.code(401).send({
			error: 'Unauthorized',
			message: err.message
		});
		return;
	}

	// NotFoundError en contexto de auth (usuario no existe) = token inválido
	if (err instanceof NotFoundError) {
		reply.code(401).send({
			error: 'Unauthorized',
			message: 'Usuario no encontrado'
		});
		return;
	}

	// JWT errors (TokenExpiredError, JsonWebTokenError)
	if (err instanceof Error && err.name === 'TokenExpiredError') {
		reply.code(401).send({
			error: 'Unauthorized',
			message: 'Token expirado'
		});
		return;
	}

	if (err instanceof Error && err.name === 'JsonWebTokenError') {
		reply.code(401).send({
			error: 'Unauthorized',
			message: 'Token malformado'
		});
		return;
	}

	// Errores genéricos
	console.error('Error en validación JWT:', err);
	reply.code(401).send({
		error: 'Unauthorized',
		message: 'Token inválido'
	});
};

/**
 * Maneja errores de negocio en controllers y los convierte en respuestas HTTP apropiadas
 * Usado en controllers para errores de lógica de negocio
 */
export const handleBusinessError = (err: unknown, reply: FastifyReply, context?: string): void => {
	if (err instanceof NotFoundError) {
		reply.code(404).send({
			error: 'Not Found',
			message: err.message,
			resource: err.resource
		});
		return;
	}

	if (err instanceof ConflictError) {
		reply.code(409).send({
			error: 'Conflict',
			message: err.message,
			field: err.field
		});
		return;
	}

	if (err instanceof ValidationError) {
		reply.code(403).send({
			error: 'Forbidden',
			message: err.message,
			field: err.field
		});
		return;
	}

	if (err instanceof UnauthorizedError) {
		reply.code(401).send({
			error: 'Unauthorized',
			message: err.message
		});
		return;
	}

	// Errores genéricos
	console.error(`Error en ${context || 'controller'}:`, err);
	const message = err instanceof Error ? err.message : 'Unknown Error';
	reply.code(500).send({
		error: 'Internal Server Error',
		message
	});
};
