import { FastifyRequest, FastifyReply } from "fastify";
import jwt from 'jsonwebtoken';
import { Value } from '@sinclair/typebox/value';
import { AuthSchemas, UserTypes, SharedErrors, AuthTypes } from "@transcendence/shared";
import { UserEnv } from "../config.js";
import { UserService } from "../services/user.service.js";

export namespace AuthMiddleware {
	/**
	 * Factory: creates a validateJWT preHandler bound to the given userService instance.
	 */
	export function createValidateJWT(userService: UserService) {
		return async (
			request: FastifyRequest,
			reply: FastifyReply
		): Promise<void> => {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith('Bearer ')) {
				throw new SharedErrors.UnauthorizedError('Authorization header faltante');
			}

			// Extraer el token
			const token = authHeader.replace('Bearer ', '');

			try {
				// Verificar el access token con jwt_secret
				const payload = jwt.verify(token, UserEnv.JWT_SECRET());

				const isValid = Value.Check(AuthSchemas.AccessTokenPayloadUntypedSchema, payload);
				if (!isValid)
					throw new SharedErrors.UnauthorizedError('Estructura de token inválida',
					{
						'context': 'User service, validateJWT middleware',
						'payload': payload
					});
					console.log('== Schema completo:', isValid);

					// TypeScript ahora infiere payload como AccessTokenPayload
					const tokenIssuedAt = payload.iat!;
					const userId = payload.id!;

					// Validar lastLogoutAt
					// Si el usuario no existe en la BD, el token es inválido
					const lastLogoutAt = await userService.getLastLogoutAt(userId);

					if (tokenIssuedAt < lastLogoutAt) {
						throw new SharedErrors.UnauthorizedError('Token invalidado por logout');
					}

					request.user = payload;
				} catch (err) {
					return SharedErrors.handleError(err, reply);
				}

				console.log('JWT válido @ AuthMiddleware @ User');
			};
		}

	export const verifyOwnership = async (
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> => {
		try {

			if (!request.user) {
				throw new SharedErrors.UnauthorizedError('Usuario no autenticado');
			}

			const paramId = (request.params as UserTypes.UserIdParams).id;

			if (paramId !== request.user.id) {
				throw new SharedErrors.ForbiddenError('No tienes permiso para acceder a este recurso');
			}
		} catch (err) {
			throw SharedErrors.handleError(err, reply);
		}
	}
}
