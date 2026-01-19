// /* EXPLICACIÓN:
// 1. import { JWT_SECRET } from "../config.js": Importamos el secreto desde la config local que acabamos de crear.
// 2. request.user = payload: Inyectamos los datos del usuario en la request (necesario declarar el tipo en Fastify o usar any temporalmente si no tienes types definition).
// */

import { FastifyRequest, FastifyReply } from 'fastify';
import { GameEnv } from "../config.js";
import jwt from 'jsonwebtoken';
// Importamos de shared para tener los tipos (AuthenticatedUser, etc.)
// y para que TS reconozca request.user automáticamente
//import { JWTPayload } from '@transcendence/shared'; 
import { AuthTypes, SharedErrors } from '@transcendence/shared'; 

export class GameMiddleware {
    
    static async validateJWT(request: FastifyRequest, reply: FastifyReply) {
        try {
            const authHeader = request.headers.authorization;
            
            // 1. Verificamos que venga el header
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                console.error("🔥 Authorization token faltante");
				throw new SharedErrors.UnauthorizedError('Authorizarion token faltante', {
					hasBearerPrefix: authHeader?.startsWith('Bearer '),
					headerPresent: !!authHeader,
					operation: 'validateJWT',
					service: 'game'
				})
            }

            // 2. Limpiamos el prefijo 'Bearer '
            const token = authHeader.replace('Bearer ', '');
            
            // 3. Obtenemos el secreto del entorno (debe ser el mismo que Auth)
			// CORRECCIÓN: Usar GameEnv en lugar de process.env directo
            // GameEnv asegura que el .env se cargó y aplica valores por defecto si es necesario
            //const secret = process.env.JWT_SECRET;
			const secret = GameEnv.JWT_SECRET(); 

            // 4. Verificamos la firma criptográfica
            // TypeScript inferirá que decoded es JWTPayload gracias al import
            const decoded = jwt.verify(token, secret) as AuthTypes.AccessTokenPayload;
            
            // 5. Inyectamos el usuario en la request
            // (Si shared se compiló bien, esto NO dará error)
			request.user = decoded;
			

			// Incorporar aquí toda la validación de LastLogoutAt...
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
