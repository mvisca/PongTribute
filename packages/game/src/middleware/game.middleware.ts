// import { FastifyRequest, FastifyReply } from "fastify";
// import jwt from 'jsonwebtoken';
// import { GameEnv } from "../config.js";

// export namespace AuthMiddleware {
// 	export const validateJWT = async (
// 		request: FastifyRequest,
// 		reply: FastifyReply
// 	): Promise<void> => {
// 		const authHeader = request.headers.authorization;

// 		if (!authHeader || !authHeader.startsWith('Bearer ')) {
// 			return await reply.status(401).send({
// 				error: 'Unauthorized',
// 				message: 'Token no proporcionado'
// 			});
// 		}

// 		const token = authHeader.substring(7);

// 		try {
// 			const payload = jwt.verify(token, GameEnv.JWT_SECRET);
// 			// Asignamos el payload al request para usarlo en controladores
// 			request.user = payload as any;
// 		} catch (err) {
// 			return await reply.status(401).send({
// 				error: 'Unauthorized',
// 				message: 'Token inválido'
// 			});
// 		}
// 	}
// }

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
import { AuthTypes } from '@transcendence/shared'; 

export class GameMiddleware {
    
    static async validateJWT(request: FastifyRequest, reply: FastifyReply) {
        try {
            const authHeader = request.headers.authorization;
            
            // 1. Verificamos que venga el header
            if (!authHeader) {
                return reply.status(401).send({ error: 'Unauthorized', message: 'No token provided' });
            }

            // 2. Limpiamos el prefijo 'Bearer '
            const token = authHeader.replace('Bearer ', '');
            
            // 3. Obtenemos el secreto del entorno (debe ser el mismo que Auth)
            const secret = process.env.JWT_SECRET;
            if (!secret) {
                console.error("🔥 FATAL: JWT_SECRET no definido en Game Service .env");
                return reply.status(500).send({ error: 'Internal Server Error' });
            }

            // 4. Verificamos la firma criptográfica
            // TypeScript inferirá que decoded es JWTPayload gracias al import
            const decoded = jwt.verify(token, secret) as AuthTypes.AccessTokenPayload;
            
            // 5. Inyectamos el usuario en la request
            // (Si shared se compiló bien, esto NO dará error)
			request.user = decoded;
			

        } catch (error) {
            console.error("⚠️ Token inválido en Game:", error);
            return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid token' });
        }
    }
}
