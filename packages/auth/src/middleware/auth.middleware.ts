import { FastifyRequest, FastifyReply } from "fastify";
import jwt from 'jsonwebtoken';
import { Value } from '@sinclair/typebox/value';
import { UserTypes, AuthSchemas, SharedErrors, AuthTypes } from "@transcendence/shared";
import { AuthEnv } from "../config.js";

/**
* Obtiene el lastLogoutAt de un usuario desde el User Service
* @returns timestamp en milisegundos
* @throws UnauthorizedError si el usuario no existe (404)
*/
const fetchLastLogoutAt = async (userId: string): Promise<number> => {
	const response = await fetch(
		`${AuthEnv.USER_SERVICE_URL()}/internal/users/${userId}/last-logout`,
		{
			method: 'GET',
			headers: {
				'X-Service-Secret': AuthEnv.SERVICE_SECRET(),
				'Content-Type': 'application/json'
			}
		}
	);

	if (!response.ok) {
		if (response.status === 404) {
			// Usuario no encontrado = token inválido
			throw new SharedErrors.NotFoundError('Usuario no encontrado', 'user', {
				userId,
				endpoint: `${AuthEnv.USER_SERVICE_URL()}/internal/users/${userId}/last-logout`,
				method: 'GET',
				status: 404,
				operation: 'fetchLastLogoutAt'
			});
		}
		throw new SharedErrors.ServiceError('user', `Error obteniendo lastLogoutAt`, {
			userId,
			endpoint: `${AuthEnv.USER_SERVICE_URL()}/internal/users/${userId}/last-logout`,
			method: 'GET',
			status: response.status,
			statusText: response.statusText,
			operation: 'fetchLastLogoutAt'
		});
	}

	const data = await response.json() as { lastLogoutAt: number };
	return data.lastLogoutAt;
};

export namespace AuthMiddleware {

	export const validateJWT = async (
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> => {
		// Extraer el authHeader
		const authHeader = request.headers.authorization;

		// Verificar que exista y sea válidos
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			throw new SharedErrors.UnauthorizedError('Authorization header faltante o inválido', {
				hasBearerPrefix: authHeader?.startsWith('Bearer '),
				headerPresent: !!authHeader,
				operation: 'validateJWT',
				service: 'auth',
				requestId: request.id
			});
		}

		// Extraer el token
		const token = authHeader.replace('Bearer ', '');

		try {
			// Verificar el access token con el jwt_secret
			const payload = jwt.verify(token, AuthEnv.JWT_SECRET()) as AuthTypes.AccessTokenPayload;

			// Validación completa
			const isValid = Value.Check(AuthSchemas.AccessTokenPayloadUntypedSchema, payload);
			request.log.info({ isValid }, '[AUTH-MIDDLEWARE] Schema validation');
			if (!isValid)
				throw new SharedErrors.UnauthorizedError('Estructura de token inválida', {
					schemaValidation: isValid,
					operation: 'validateJWT',
					payloadKeys: Object.keys(payload),
					requestId: request.id
				});

			// TypeScript ahora infiere payload como AccessTokenPayload
			const tokenIssuedAt = payload.iat!;
			const userId = payload.id;

			// Validar lastLogoutAt
			// Si el usuario no existe, fetchLastLogoutAt lanzará UnauthorizedError
			const lastLogoutAt = await fetchLastLogoutAt(userId);

			if (tokenIssuedAt < lastLogoutAt) {
				throw new SharedErrors.UnauthorizedError('Token invalidado por logout', {
					userId,
					tokenIssuedAt,
					lastLogoutAt,
					operation: 'validateJWT',
					payloadKeys: Object.keys(payload),
					requestId: request.id
				});
			}

			request.user = payload;
		} catch (err) {
			return SharedErrors.handleError(err, reply);
		}

		request.log.info('[AUTH-MIDDLEWARE] JWT valid');
	}

	export const verifyOwnership = async (
		request: FastifyRequest, // usar tipo de schema params id
		reply: FastifyReply
	): Promise<void> => {

		try {
			if (!request.user) {
				throw new SharedErrors.UnauthorizedError('Usuario  no autenticado', {
					operation: 'verifyOwnership',
					requestId: reply.request.id,
					userPresent: false
				});
			}

			const { id } = request.params as UserTypes.UserIdParams;

			if (id !== request.user.id) {
				throw new SharedErrors.UnauthorizedError('No tienes permiso para acceder a este recurso', {
					operation: 'verifyOwnership',
					requestId: reply.request.id,
					userIdFromAuth: request.user.id,
					userIdFromParams: id
				});
			}
		} catch (err) {
			return SharedErrors.handleError(err, reply);
		}
	};
}