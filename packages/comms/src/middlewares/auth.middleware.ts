import { SharedErrors } from "@transcendence/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import jwt from 'jsonwebtoken';
import { CommsEnv } from "src/config.js";

interface JWTPayload {
    id: string;
    username: string;
    email: string;
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

		let payload: JWTPayload;
		try {
			payload = jwt.verify(token, CommsEnv.JWT_SECRET()) as JWTPayload;

			// Validación básica: debe contener user id
			if (!payload || !payload.id) {
				throw new SharedErrors.UnauthorizedError('Estructura de token inválida', {
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