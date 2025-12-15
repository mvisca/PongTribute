import { FastifyRequest, FastifyReply } from "fastify";
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from "../config.js";

export namespace AuthMiddleware {
    export const validateJWT = async (
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> => {
        const authHeader = request.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return await reply.status(401).send({
                error: 'Unauthorized',
                message: 'Token no proporcionado'
            });
        }
        
        const token = authHeader.substring(7);
        
        try {
            const payload = jwt.verify(token, JWT_SECRET);
            // Asignamos el payload al request para usarlo en controladores
            request.user = payload as any; 
        } catch (err) {
            return await reply.status(401).send({
                error: 'Unauthorized',
                message: 'Token inválido'
            });
        }
    }
}

/* EXPLICACIÓN:
1. import { JWT_SECRET } from "../config.js": Importamos el secreto desde la config local que acabamos de crear.
2. request.user = payload: Inyectamos los datos del usuario en la request (necesario declarar el tipo en Fastify o usar any temporalmente si no tienes types definition).
*/