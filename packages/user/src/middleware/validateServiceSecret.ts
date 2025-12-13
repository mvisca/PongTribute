import { FastifyRequest, FastifyReply } from 'fastify';
import { UserEnv } from '../index.js';

/**
* Protección para acceso solo desde servicios internos
* Importa SERVICE_SECRET de config
* Es un middleware para la ruta /users/by-email/:email
*/
export async function validateServiceSecret(
	request: FastifyRequest,
	reply: FastifyReply
) {
	const providedSecret = request.headers['x-service-secret'];
	
	if (!providedSecret || providedSecret !== UserEnv.SERVICE_SECRET) {
		return reply.status(403).send({
			error: 'Forbidden',
			message: 'Invalid or missing service secret'
		});
	}
}