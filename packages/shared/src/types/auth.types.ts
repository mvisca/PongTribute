import { Static } from '@sinclair/typebox';
import { AuthSchemas } from '../schemas/auth.schema.js';

export namespace AuthTypes {
	
	// ========================================================================
	// COMUNES
	// ========================================================================
	
	/** Datos del usuario en respuestas */
	export type UserPayload = Static<typeof AuthSchemas.UserPayloadSchema>;
	
	// ========================================================================
	// LOGIN
	// ========================================================================
	
	/** Body que envía el cliente al login */
	export type LoginBody = Static<typeof AuthSchemas.LoginBody>;
	
	/** Respuesta del servidor al login exitoso */
	export type LoginResponse = Static<typeof AuthSchemas.LoginBodySchema.response[200]>;
	
	// ========================================================================
	// UPDATE PASSWORD
	// ========================================================================
	
	/** Body que envía el cliente para cambiar password */
	export type UpdatePasswordBody = Static<typeof AuthSchemas.UpdatePasswordBody>;
	
	// ========================================================================
	// REFRESH TOKEN - SERVICIO CLIENTE HTTP
	// ========================================================================
	
	/** Body que envía el cliente al refresh */
	export type RefreshTokenBody = Static<typeof AuthSchemas.RefreshTokenBody>;
	
	/** Respuesta del servidor al refresh exitoso con dos tokens*/
	export type RefreshTokenResponse = Static<typeof AuthSchemas.RefreshTokenResponse>;
	
	// ========================================================================
	// REFRESH TOKEN - INTERNOS
	// ========================================================================
	
	/** Body para crear refresh token en user service */
	export type RefreshTokenDataBody = Static<typeof AuthSchemas.RefreshTokenDataBody>;
	
	/** Respons al crear o verificar token */
	export type RefreshTokenResponseBody = Static<typeof AuthSchemas.RefreshTokenResponseBody>;
	
	/** Body para verificar token por hash */
	export type VerifyRefreshTokenBody = Static<typeof AuthSchemas.VerifyRefreshTokenBody>;
	
	/** Params para borrar tokens por userId */
	export type DeleteRefreshTokenByUserParams = Static<typeof AuthSchemas.DeleteRefreshTokenByUserParams>;
	
	// ========================================================================
	// REFRESH TOKEN - DOMINIO (lógica interna, no HTTP)
	// ========================================================================
	
	/** Token en dominio (camelCase) */
	export type RefreshTokenRecord = RefreshTokenDataBody & { 
		id: string,
		createdAt: string
	};
	
	/** Payload dentro del JWT refresh */
	export interface RefreshTokenPayload {
		userId: string;
		tokenId: string;
		is2FAVerified: boolean;
	}
	
	// ========================================================================
	// REFRESH TOKEN - BASE DE DATOS (snake_case)
	// ========================================================================
	
	/** Token en DB (snake_case) */
	export interface RefreshTokenRow {
		id: string;
		user_id: string;
		token_hash: string;
		expires_at: number;
		is_2fa_verified: number;
		created_at: number;
	}
}