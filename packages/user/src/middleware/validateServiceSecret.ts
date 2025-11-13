import { FastifyRequest, FastifyReply } from 'fastify';
import { SERVICE_SECRET } from '../config';

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
	
	// TODO quitar log de middleware
	console.log('📨 Header recibido:', providedSecret);
	console.log('🔐 Secret esperado:', SERVICE_SECRET);
	console.log('✅ Match:', providedSecret === SERVICE_SECRET);
	
	if (!providedSecret || providedSecret !== SERVICE_SECRET) {
		return reply.status(403).send({
			error: 'Forbidden',
			message: 'Invalid or missing service secret'
		});
	}
}