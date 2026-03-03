import { FastifyReply, FastifyRequest } from 'fastify';
import { ImagesEnv } from '../config.js';

export async function validateServiceSecret(
	request: FastifyRequest,
	reply: FastifyReply
) {
	const providedSecret = request.headers['x-service-secret'];
	const normalizedSecret = Array.isArray(providedSecret)
		? providedSecret[0]
		: providedSecret;

	if (!normalizedSecret || normalizedSecret !== ImagesEnv.SERVICE_SECRET()) {
		return reply.status(403).send({
			error: 'Forbidden',
			message: 'Invalid or missing service secret'
		});
	}
}
