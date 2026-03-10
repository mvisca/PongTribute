import { Value } from '@sinclair/typebox/value';
import { FastifyReply, FastifyRequest } from "fastify";
import jwt from 'jsonwebtoken';
import type { Redis } from 'ioredis';
import { AuthSchemas, AuthTypes, SharedErrors } from "@transcendence/shared";
import { CommsEnv } from "../config.js";

export namespace CommsMiddleware {
	// Returns a preHandler that validates the JWT from the query string and
	// checks lastLogoutAt against Redis to reject tokens invalidated by logout.
	export function validateJWT(redis: Redis) {
		return async function(
			request: FastifyRequest,
			reply: FastifyReply
		): Promise<void> {

			// WS auth via query string token — captured in gateway onRequest hook
			const query = request.query as { token?: string };
			const { token } = query;

			if (!token) {
				throw new SharedErrors.UnauthorizedError('Token requerido', {
					middleware: 'validateJWT',
					endpoint: '/api/comms/ws'
				});
			}

			try {
				// Verificar firma del JWT
				const payload = jwt.verify(token, CommsEnv.JWT_SECRET()) as AuthTypes.AccessTokenPayload;

				// Type guard
				const isValid = Value.Check(AuthSchemas.AccessTokenPayloadUntypedSchema, payload);
				if (!isValid) {
					throw new SharedErrors.UnauthorizedError('Estructura de token inválida', {
						operation: 'validateJWT',
						endpoint: '/api/comms/ws'
					});
				}

				// Leer lastLogoutAt de Redis
				const tokenIssuedAt = payload.iat!;
				const cached = await redis.get(`cache:lastLogoutAt:${payload.id}`);

				// Si no hay caché, el token se considera válido (usuario nunca hizo logout)
				if (cached !== null) {
					const lastLogoutAt = Number(cached);
					if (tokenIssuedAt < lastLogoutAt) {
						throw new SharedErrors.UnauthorizedError('Token invalidado por logout', {
							userId: payload.id,
							tokenIssuedAt,
							lastLogoutAt,
							operation: 'validateJWT',
							endpoint: '/api/comms/ws'
						});
					}
				}
				request.user = payload;

			} catch (err) {
				return SharedErrors.handleError(err, reply);
			}
		};
	}
}
