import { FastifyRequest, FastifyReply } from "fastify";
import jwt from 'jsonwebtoken';
import { UserEnv } from "../config";
import { SharedEnv } from "@transcendence/shared";

// TODO unificar tipo de funcio con validateServiceSecret

export const validateJWT = async (
	request: FastifyRequest,
	reply: FastifyReply
): Promise<void> => {
	const authHeader = request.headers.authorization;
	const sharedEnv = SharedEnv.build();

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return await reply.status(401).send({
			error: 'Unauthorized',
			message: 'Authorization header faltante o inválido'
		});
	}

	const token = authHeader.substring(7);
	console.log(`Token extraido: ${token}`);

	try {
		const payload = jwt.verify(token, sharedEnv.JWT_SECRET);
		request.user = payload;
	} catch (err) {
		return await reply.status(401).send({
			error: 'Invalid token',
			message: 'Token caducado o inválido'
		});
	}

	console.log('JWT válido');
	
}