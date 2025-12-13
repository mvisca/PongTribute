import { FastifyRequest, FastifyReply } from "fastify";
import jwt from 'jsonwebtoken';
import { UserTypes } from "@transcendence/shared";
import { AuthEnv } from "../config.js";

// TODO unificar tipo de funcion con validateServiceSecret
// TODO verificar que este middleware y el otro en este directorio son necesarios ambos, deben centralizarse si son iguales al de auth?
// TODO considerar riesgos de secondary effects al ponerlo en shared, por que se implementó en cada servicio? no documentado
export namespace AuthMiddleware {
	export const validateJWT = async (
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> => {
		const authHeader = request.headers.authorization;
		
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return await reply.status(401).send({
				error: 'Unauthorized',
				message: 'Authorization header faltante o inválido'
			});
		}
		
		const token = authHeader.substring(7);
		//	console.log(`Token extraido: ${token}`);
		
		try {
			const payload = jwt.verify(token, AuthEnv.JWT_SECRET);
			
			if (typeof payload === 'string') {
				throw new Error('Tipo de token inválido');
			}

			request.user = {
				id: payload.id as string,
				username: payload.username as string,
				email: payload.email as string
			};
		} catch (err) {
			return await reply.status(401).send({
				error: 'Invalid token',
				message: 'Token caducado o inválido'
			});
		}
		
		console.log('JWT válido');
	}

	export const verifyOwnership = async (
		request: FastifyRequest, // usar tipo de schema params id
		reply: FastifyReply
	): Promise<void> => {

		if (!request.user) {
			return await reply.status(401).send({
				error: 'Unauthorized',
				message: 'Usuario  no autenticado'
			});
		}

		const paramId = (request.params as UserTypes.UserIdParams).id;

		if (paramId !== request.user.id) {
			return await reply.status(403).send({
				error: 'Forbiden',
				message: 'No tienes permiso para acceder a este recurso'
			});
		}
	};
}