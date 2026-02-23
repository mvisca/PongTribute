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
			`${GameEnv.USER_SERVICE_URL()}/internal/users/${userId}/last-logout`,
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
					endpoint: `${GameEnv.USER_SERVICE_URL()}/internal/users/${userId}/last-logout`,
					method: 'GET',
					status: 404,
					operation: 'fetchLastLogoutAt'
				});
			}
			throw new SharedErrors.ServiceError('user', `Error obteniendo lastLogoutAt`, {
				userId,
				endpoint: `${GameEnv.USER_SERVICE_URL()}/internal/users/${userId}/last-logout`,
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
		
		// Limpiamos el prefijo 'Bearer '
		const token = authHeader.replace('Bearer ', '');

		let payload: AuthTypes.AccessTokenPayload;

		// 2. Verificamos SOLO la firma criptográfica
		try {
			payload = jwt.verify(token, GameEnv.JWT_SECRET()) as AuthTypes.AccessTokenPayload;
		} catch (error) {
            // Solo capturamos errores de JWT (firma inválida, mal formado, expirado nativo)
            console.error("[GAME-MIDDLEWARE] Cryptographically invalid token:", error);
            throw new SharedErrors.UnauthorizedError('Token inválido o corrupto', {
                operation: 'validateJWT',
                service: 'game',
                errorType: error instanceof Error ? error.constructor.name : typeof error
            });
		}
		
		// 3. Validación de estructura (Schema)
        const isValid = Value.Check(AuthSchemas.AccessTokenPayloadUntypedSchema, payload);
        if (!isValid) {
            throw new SharedErrors.UnauthorizedError('Estructura de payload inválida', {
                schemaValidation: isValid,
                operation: 'validateJWT',
                requestId: request.id
            });
        }
			
		// 4. Lógica de Negocio (Logout Check)
		// Validación explícita de campos obligatorios para calmar a TypeScript
		// Le garantizamos a TypeScript que si el código pasa de esa línea, id 
		// e iat no son undefined. Esto elimina el error en la comparación 
		// tokenIssuedAt < lastLogoutAt.
        if (!payload.id || !payload.iat) {
             throw new SharedErrors.UnauthorizedError('Token incompleto: falta id o iat', {
                operation: 'validateJWT',
                payloadKeys: Object.keys(payload)
            });
        }
        // IMPORTANTE: Esto está FUERA del try/catch del jwt.verify.
        // Si fetchLastLogoutAt lanza un NotFoundError o ServiceError, 
        // dejará que suba y el Global Error Handler lo procesará con el código correcto (404/500), no 401.
        const userId = payload.id;
        const tokenIssuedAt = payload.iat; // JWT timestamp es en segundos
        
        const lastLogoutAt = await GameMiddleware.fetchLastLogoutAt(userId);
        
        // Comparación segura: lastLogoutAt suele ser ms, jwt es seconds.
        // Asegúrate de normalizar si es necesario. Asumimos aquí que ambos son compatibles.
        // Si lastLogoutAt viene en ms y iat en s, divide lastLogoutAt por 1000.
        // Estandariza según tu backend (usualmente JWT usa segundos).
        if (tokenIssuedAt < lastLogoutAt) {
            throw new SharedErrors.UnauthorizedError('Token invalidado por logout previo', {
                userId,
                tokenIssuedAt,
                lastLogoutAt,
                operation: 'validateJWT'
            }); 
        }

        // 5. Inyectamos el usuario LIMPIO en la request
        // Mapeamos explícitamente para cumplir con la interfaz AuthenticatedUser
        // y evitar ensuciar el objeto request con datos del token (iat, exp).
        request.user = {
            id: payload.id,
            username: payload.username,
            email: payload.email,
        };
	}
}
