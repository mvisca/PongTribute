import { FastifyRequest, FastifyReply } from "fastify";
import jwt from 'jsonwebtoken';
import { Value } from '@sinclair/typebox/value';
import { AuthSchemas, UserTypes, SharedErrors } from "@transcendence/shared";
import { UserEnv } from "../config.js";
import { UserService } from "../services/user.service.js";

// TODO unificar tipo de funcion con validateServiceSecret
// TODO verificar que este middleware y el otro en este directorio son necesarios ambos, deben centralizarse si son iguales al de auth?

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
			const payload = jwt.verify(token, UserEnv.JWT_SECRET);
			
			// Validar estructura del payload
			if (!Value.Check(AuthSchemas.AccessTokenPayloadSchema, payload)) {
				throw new SharedErrors.UnauthorizedError('Estructura de token inválida');
			}
			
			// Después de la validación anterior Typescript infiere Payload como AccessTokenPayload
			const tokenIssuedAt = payload.iat!; // iat! porque es Optional, pero jwt.verify siempre lo añade
			const userId = payload.id;
			
			// Validar lastLogoutAt usando acceso directo al servicio
			if (!userServiceInstance) {
				throw new Error('UserService no inyectado en middleware');
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
			return SharedErrors.handleAuthError(err, reply); // TODO por consistencia en manejo de errores centralizado qué se debería lanzar aquí? un Error genérico que maneje el setErrorandler de la app?
		}
		
		console.log('JWT válido');
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
			throw SharedErrors.handleAuthError(err, reply);  // TODO idem catch del validateJWT / APlicar decision tambien a auth middlewares y game middlewares
		}
	}
}