// /* EXPLICACIÓN:
// 1. import { JWT_SECRET } from "../config.js": Importamos el secreto
//  desde la config local que acabamos de crear.
// 2. request.user = payload: Inyectamos los datos del usuario en la 
// request (necesario declarar el tipo en Fastify o usar any 
// temporalmente si no tienes types definition).
// */

import { FastifyRequest, FastifyReply } from 'fastify';
import { GameEnv } from "../config.js";
import jwt from 'jsonwebtoken';
import { Value } from '@sinclair/typebox/value';
// Importamos de shared para tener los tipos (AuthenticatedUser, etc.)
// y para que TS reconozca request.user automáticamente
//import { JWTPayload } from '@transcendence/shared'; 
import { AuthSchemas, AuthTypes, SharedErrors, UserTypes } from '@transcendence/shared';


export class GameMiddleware {
	
	private static async fetchLastLogoutAt(userId: string): Promise<number> {
		const response = await fetch(
			`${GameEnv.USER_SERVICE_URL()}/internal/users/${userId}/logout`,
			{
				method: 'GET',
				headers: {
					'X-Service-Secret': GameEnv.SERVICE_SECRET(),
					'Content-Type': 'application/json'
				}
			}
		);
		
		if (!response.ok) {
			if (response.status === 404) {
				// Usuario no encontrado = token inválido
				throw new SharedErrors.NotFoundError('Usuario no encontrado', 'user', {
					userId,
					endpoint: `${GameEnv.USER_SERVICE_URL()}/internal/users/${userId}/logout`,
					method: 'GET',
					status: 404,
					operation: 'fetchLastLogoutAt'
				});
			}
			throw new SharedErrors.ServiceError('user', `Error obteniendo lastLogoutAt`, {
				userId,
				endpoint: `${GameEnv.USER_SERVICE_URL()}/internal/users/${userId}/logout`,
				method: 'GET',
				status: response.status,
				statusText: response.statusText,
				operation: 'fetchLastLogoutAt'
			});
		}
		
		const data = await response.json() as { lastLogoutAt: number };
		return data.lastLogoutAt;
	};
	
	static async validateJWT(request: FastifyRequest, reply: FastifyReply) {
		const authHeader = request.headers.authorization;
		
		// 1. Verificamos que venga el header
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			throw new SharedErrors.UnauthorizedError('Authorizarion token faltante', {
				hasBearerPrefix: authHeader?.startsWith('Bearer '),
				headerPresent: !!authHeader,
				operation: 'validateJWT',
				service: 'game',
				requestId: request.id
			})
		}
		
		// 2. Limpiamos el prefijo 'Bearer '
		const token = authHeader.replace('Bearer ', '');
		
		try {
			// 3. Verificamos la firma criptográfica
			// TypeScript inferirá que decoded es JWTPayload gracias al import
			const payload = jwt.verify(token, GameEnv.JWT_SECRET()) as AuthTypes.AccessTokenPayload;
			
			const isValid = Value.Check(AuthSchemas.AccessTokenPayloadUntypedSchema, payload);
			console.log('== Schema completo:', isValid);
			if (!isValid) 
				throw new SharedErrors.UnauthorizedError('Estructura de token inválida', {
				schemaValidation: isValid,
				operation: 'validateJWT',
				payloadKeys: Object.keys(payload),
				requestId: request.id
			});
			
			const tokenIssuedAt = payload.iat!;
			const userId = payload.id!;
			
			const lastLogoutAt = await GameMiddleware.fetchLastLogoutAt(userId);
			
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

			// 4. Inyectamos el usuario en la request
			// (Si shared se compiló bien, esto NO dará error)
			request.user = payload;
		} catch (error) {
			console.error("⚠️ Token inválido en Game:", error);
			throw new SharedErrors.UnauthorizedError('Invalid token', {
				operation: 'validateJWT',
				service: 'game',
				errorType: error instanceof Error ? error.constructor.name : typeof error
			});
		}
	}
}
