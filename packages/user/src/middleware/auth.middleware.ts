import { FastifyRequest, FastifyReply } from "fastify";
import jwt from 'jsonwebtoken';
import { Value } from '@sinclair/typebox/value';
import { AuthSchemas, UserTypes, SharedErrors, AuthTypes } from "@transcendence/shared";
import { UserEnv } from "../config.js";
import { UserService } from "../services/user.service.js";

export namespace AuthMiddleware {
	let userServiceInstance: UserService | null = null;
	
	/**
	* Inyecta la instancia de UserService para uso en el middleware
	*/
	export const setUserService = (service: UserService): void => {
		userServiceInstance = service;
	};
	
	export const validateJWT = async (
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> => {
		const authHeader = request.headers.authorization;
		
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			throw new SharedErrors.UnauthorizedError('Authorization header faltante');
		}
		
		// Extraer eltoken
		const token = authHeader.substring(7);
		//	console.log(`Token extraido: ${token}`);
		
		try {
			// Verificar el access token con jwt_secret
			const payload = jwt.verify(token, UserEnv.JWT_SECRET()) as AuthTypes.AccessTokenPayload;
			
			const isValid = Value.Check(AuthSchemas.AccessTokenPayloadUntypedSchema, payload);
			if (!isValid) 
				throw new SharedErrors.UnauthorizedError('Estructura de token inválida');
			console.log('== Schema completo:', isValid);
			
			// TypeScript ahora infiere payload como AccessTokenPayload
			const tokenIssuedAt = payload.iat!;
			const userId = payload.id;
			
			// Validar lastLogoutAt usando acceso directo al servicio
			if (!userServiceInstance) {
				throw new SharedErrors.InternalError('UserService no inyectado en middleware');
			}
			
			// Validar lastLogoutAt
			// Si el usuario no existe en la BD, el token es inválido
			const lastLogoutAt = await userServiceInstance.getLastLogoutAt(userId);
			
			// Convertir lastLogoutAt de milisegundos a segundos para comparar con iat
			const lastLogoutAtSeconds = Math.floor(lastLogoutAt / 1000);
			
			if (tokenIssuedAt < lastLogoutAtSeconds) {
				throw new SharedErrors.UnauthorizedError('Token invalidado por logout');
			}
			
			request.user = payload;
		} catch (err) {
			return SharedErrors.handleError(err, reply);
		}
		
		console.log('JWT válido @ AuthMiddleware @ User');
	}
	
	export const verifyOwnership = async (
		request: FastifyRequest, // usar tipo de schema params id
		reply: FastifyReply
	): Promise<void> => {
		try {
			
			if (!request.user) {
				throw new SharedErrors.UnauthorizedError('Usuario no autenticado');
			}
			
			const paramId = (request.params as UserTypes.UserIdParams).id;
			
			if (paramId !== request.user.id) {
				throw new SharedErrors.UnauthorizedError('No tienes permiso para acceder a este recurso'); // DUDA forbiden 403 (está lanznado el correcto)
			}
		} catch (err) {
			throw SharedErrors.handleError(err, reply);
		}
	}
}