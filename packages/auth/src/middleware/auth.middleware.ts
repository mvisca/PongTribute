import { FastifyRequest, FastifyReply } from "fastify";
import jwt from 'jsonwebtoken';
import { Value } from '@sinclair/typebox/value';
import { UserTypes, AuthSchemas, SharedErrors, AuthTypes } from "@transcendence/shared";
import { AuthEnv } from "../config.js";

// TODO unificar tipo de funcion con validateServiceSecret
// TODO verificar que este middleware y el otro en este directorio son necesarios ambos, deben centralizarse si son iguales al de auth?
// TODO considerar riesgos de secondary effects al ponerlo en shared, por que se implementó en cada servicio? no documentado

/**
 * Obtiene el lastLogoutAt de un usuario desde el User Service
 * @returns timestamp en milisegundos
 * @throws UnauthorizedError si el usuario no existe (404)
 */
const fetchLastLogoutAt = async (userId: string): Promise<number> => {
	const response = await fetch(
		`${AuthEnv.USER_SERVICE_URL}/internal/users/${userId}/logout`,
		{
			method: 'GET',
			headers: {
				'X-Service-Secret': AuthEnv.SERVICE_SECRET,
				'Content-Type': 'application/json'
			}
		}
	);

	if (!response.ok) {
		if (response.status === 404) {
			// Usuario no encontrado = token inválido
			throw new SharedErrors.UnauthorizedError('Usuario no encontrado');
		}
		throw new Error(`Error obteniendo lastLogoutAt: ${response.status}`);
	}

	const data = await response.json() as { lastLogoutAt: number };
	return data.lastLogoutAt;
};

export namespace AuthMiddleware {

	export const validateJWT = async (
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> => {
		// Extraer el authHeader
		const authHeader = request.headers.authorization;
		
		// Verificar que exista y sea válidos
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			throw new SharedErrors.UnauthorizedError('Authorization header faltante o inválido');
		}
		
		// Extraer el token
		const token = authHeader.substring(7);
		//	console.log(`Token extraido: ${token}`);
		
		try {
			// Verificar el access token con el jwt_secret
			const payload = jwt.verify(token, AuthEnv.JWT_SECRET) as AuthTypes.AccessTokenPayload;

			// WIP HERE
			// Test individual de cada campo
			console.log('Validando campos:');
			console.log('id:', Value.Check(AuthSchemas.UuidFieldEx, payload.id));
			console.log('username:', Value.Check(AuthSchemas.UsernameFieldEx, payload.username));
			console.log('email:', Value.Check(AuthSchemas.EmailFieldEx, payload.email));
			console.log('has2FA:', Value.Check(AuthSchemas.BooleanFieldEx, payload.has2FAEnabled));
			console.log('is2FA:', Value.Check(AuthSchemas.BooleanFieldEx, payload.is2FAVerified));
			
			// Validación completa
			const isValid = Value.Check(AuthSchemas.AccessTokenPayloadSchema, payload);
			console.log('Schema completo:', isValid);
			
			// Validar estructura del payload
			/*			if (!Value.Check(AuthSchemas.AccessTokenPayloadSchema, payload)) {
			throw new SharedErrors.UnauthorizedError('Estructura de token inválida');
			} */

			// TypeScript ahora infiere payload como AccessTokenPayload
			const tokenIssuedAt = payload.iat!; // ! porque es Optional pero jwt.verify siempre lo añade
			const userId = payload.id;

			// Validar lastLogoutAt
			// Si el usuario no existe, fetchLastLogoutAt lanzará UnauthorizedError
			const lastLogoutAt = await fetchLastLogoutAt(userId);

			// Convertir lastLogoutAt de milisegundos a segundos para comparar con iat
			const lastLogoutAtSeconds = Math.floor(lastLogoutAt / 1000);

			if (tokenIssuedAt < lastLogoutAtSeconds) {
				throw new SharedErrors.UnauthorizedError('Token invalidado por logout');
			}

			request.user = payload;
		} catch (err) {
			return SharedErrors.handleAuthError(err, reply);
		}
		
		console.log('JWT válido');
	}

	export const verifyOwnership = async (
		request: FastifyRequest, // usar tipo de schema params id
		reply: FastifyReply
	): Promise<void> => {

		if (!request.user) {
			throw new SharedErrors.UnauthorizedError('Usuario  no autenticado');
		}

		const { id } = request.params as UserTypes.UserIdParams;

		if (id !== request.user.id) {
			throw new SharedErrors.UnauthorizedError('No tienes permiso para acceder a este recurso'); // DUDA es 403 0 401? falta un shared error para manejarlo??
		}
	};
}