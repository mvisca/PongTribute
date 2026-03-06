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
				throw new SharedErrors.UnauthorizedError('Authorization header missing');
			}

			// Extraer el token
			const token = authHeader.replace('Bearer ', '');

			try {
				// Verificar el access token con jwt_secret
				const payload = jwt.verify(token, UserEnv.JWT_SECRET());

				const isValid = Value.Check(AuthSchemas.AccessTokenPayloadUntypedSchema, payload);
				if (!isValid)
					throw new SharedErrors.UnauthorizedError('Invalid token structure',
					{
						'context': 'User service, validateJWT middleware',
						'payload': payload
					});
					console.log('[USER-MIDDLEWARE] Schema validation:', isValid);

					// TypeScript ahora infiere payload como AccessTokenPayload
					const tokenIssuedAt = payload.iat!;
					const userId = payload.id!;

					// Validate lastLogoutAt
					// If the user does not exist in the DB, the token is invalid
					const lastLogoutAt = await userService.getLastLogoutAt(userId);

					if (tokenIssuedAt < lastLogoutAt) {
						throw new SharedErrors.UnauthorizedError('Token invalidated by logout');
					}

					request.user = payload;
				} catch (err) {
					return SharedErrors.handleError(err, reply);
				}

				console.log('[USER-MIDDLEWARE] JWT valid');
			};
		}

	export const verifyOwnership = async (
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> => {
		try {

			if (!request.user) {
				throw new SharedErrors.UnauthorizedError('User not authenticated');
			}

			const paramId = (request.params as UserTypes.UserIdParams).id;

			if (paramId !== request.user.id) {
				throw new SharedErrors.ForbiddenError('You do not have permission to access this resource');
			}
		} catch (err) {
			throw SharedErrors.handleError(err, reply);
		}
	}
}
