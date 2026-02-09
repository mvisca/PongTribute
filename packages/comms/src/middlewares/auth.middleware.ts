import { Value } from '@sinclair/typebox/value';
import { FastifyReply, FastifyRequest } from "fastify";
import jwt from 'jsonwebtoken';
import { AuthSchemas, AuthTypes, SharedErrors } from "@transcendence/shared";
import { CommsEnv } from "src/config.js";

async function fetchLastLogoutAt(userId: string): Promise<number> {
	const response = await fetch(
		`${CommsEnv.USER_SERVICE_URL()}/internal/users/${userId}/logout`,
		{
			method: 'GET',
			headers: {
				'X-Service-Secret': CommsEnv.SERVICE_SECRET(),
				'Content-Type': 'application/json'
			}
		}
	);

	if (!response.ok) {
		if (response.status === 404) {
			throw new SharedErrors.NotFoundError('Usuario no encontrado', 'user', {
				userId,
				operation: 'fetchLastLogoutAt'
			});
		}
		throw new SharedErrors.ServiceError('user', 'Fallo obteniendo lastLogoutAt', {
			userId,
			status: response.status,
			operation: 'fetchLastLogoutAt'
		});
	}

	const data = await response.json() as { lastLogoutAt: number }
	return data.lastLogoutAt;
}

export namespace CommsMiddleware {
	export async function validateJWT(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> {
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
			const isValid = Value.Check(AuthSchemas.AccessTokenPayloadSchema, payload);
			if (!isValid) {
				throw new SharedErrors.UnauthorizedError('Estructura de token inválida', {
					operation: 'validateJWT',
					endpoint: '/api/comms/ws'
				});
			}

			// Validar lastLogoutAt
			const tokenIssuedAt = payload.iat!;
			const lastLogoutAt = await fetchLastLogoutAt(payload.id);

			if (tokenIssuedAt < lastLogoutAt) {
				throw new SharedErrors.UnauthorizedError('Token invalidado por logout', {
					userId: payload.id,
					tokenIssuedAt: payload.iat,
					lastLogoutAt: lastLogoutAt,
					operation: 'validateJWT',
					endpoint: '/api/comms/ws'
				});
			}
		
			request.user = payload;
			
		} catch (err) {
			return SharedErrors.handleError(err, reply);
		}
	}

}