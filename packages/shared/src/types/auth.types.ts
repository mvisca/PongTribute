import { Static } from '@sinclair/typebox';
import { AuthSchemas } from '../index.js';
import { UserSchemas } from '../index.js';

export namespace AuthTypes {
	
	// ========================================================================
	// COMUNES
	// ========================================================================
	
	/** Datos del usuario en respuestas de auth */
	export type UserPayload = Static<typeof AuthSchemas.UserPayloadSchema>;
	
	/** Params de rutas con :id */
	export type UserIdParams = Static<typeof AuthSchemas.UserIdParams>;
	
	// ========================================================================
	// LOGIN
	// ========================================================================
	
	/** Body de POST /auth/login */
	export type LoginBody = Static<typeof AuthSchemas.LoginBody>;
	
	/** Response cuando login exitoso (con tokens) */
	export type LoginSuccessResponse = Static<typeof AuthSchemas.LoginSuccessResponse>;
	
	/** Response cuando login requiere 2FA */
	export type Login2FARequiredResponse = Static<typeof AuthSchemas.Login2FARequiredResponse>;
	
	/** Union type para response de login */
	export type LoginResponse = LoginSuccessResponse | Login2FARequiredResponse;
	
	// ========================================================================
	// 2FA SETUP - Activar y Verificar
	// ========================================================================
	
	/** Response de POST /auth/:id/enable-2fa */
	export type Enable2FAResponse = Static<typeof AuthSchemas.Enable2FAResponse>;
	
	/** Body de POST /auth/:id/verify-2fa-setup */
	export type Verify2FASetupBody = Static<typeof AuthSchemas.Verify2FASetupBody>;
	
	// ========================================================================
	// 2FA LOGIN - Verificar código en login
	// ========================================================================
	
	/** Body de POST /auth/verify-2fa */
	export type LoginVerify2FABody = Static<typeof AuthSchemas.LoginVerify2FABody>;
	
	// ========================================================================
	// 2FA RECOVERY - Backup Code
	// ========================================================================
	
	/** Body de POST /auth/verify-backup-code */
	export type VerifyBackupCodeBody = Static<typeof AuthSchemas.VerifyBackupCodeBody>;
	
	// ========================================================================
	// 2FA DISABLE
	// ========================================================================
	
	/** Body de POST /auth/:id/disable-2fa */
	export type Disable2FABody = Static<typeof AuthSchemas.Disable2FABody>;
	
	// ========================================================================
	// 2FA INTERNAL - Auth CONSUME desde User service
	// ========================================================================
	
	/** Body para llamar PATCH /internal/users/:id/2fa-status */
	export type Update2FAStatusBody = Static<typeof UserSchemas.Update2FAStatusBody>;
	
	// ========================================================================
	// 2FA CACHE - Datos temporales en Redis
	// ========================================================================
	
	/**
	 * Datos almacenados en RedisCache durante setup 2FA
	 * Key: setupToken (hex 64 chars)
	 * TTL: 10 minutos
	 */
	export interface SetupTokenData {
		userId: string;
		totpSecret: string;        // Base32 TOTP secret
		backupCodeHash: string;    // Bcrypt hash del backup code
	}
	
	// ========================================================================
	// UPDATE PASSWORD
	// ========================================================================
	
	/** Body de POST /auth/:id/update-password */
	export type UpdatePasswordBody = Static<typeof AuthSchemas.UpdatePasswordBody>;
	
	// ========================================================================
	// REFRESH TOKEN - Cliente HTTP
	// ========================================================================
	
	/** Body de POST /auth/refresh */
	export type RefreshTokenBody = Static<typeof AuthSchemas.RefreshTokenBody>;
	
	/** Response de POST /auth/refresh */
	export type RefreshTokenResponse = Static<typeof AuthSchemas.RefreshTokenResponse>;
	
	// ========================================================================
	// REFRESH TOKEN - Auth CONSUME desde User service
	// ========================================================================
	
	/** Body para llamar POST /internal/tokens */
	export type RefreshTokenData = Static<typeof UserSchemas.RefreshTokenData>;
	
	/** Response de POST /internal/tokens y POST /internal/tokens/verify */
	export type RefreshTokenResponseBody = Static<typeof UserSchemas.RefreshTokenResponseBody>;
	
	/** Body para llamar POST /internal/tokens/verify */
	export type VerifyRefreshTokenBody = Static<typeof UserSchemas.VerifyRefreshTokenBody>;
	
	/** Params para llamar DELETE /internal/tokens/user/:id */
	export type DeleteRefreshTokenByUserParams = Static<typeof UserSchemas.DeleteRefreshTokenByUserParams>;
	
	// ========================================================================
	// REFRESH TOKEN - Dominio (lógica interna)
	// ========================================================================
	
	/**
	 * Token en formato de dominio (camelCase)
	 * Usado internamente en services
	 */
	export type RefreshTokenRecord = RefreshTokenResponseBody;
	
	// ========================================================================
	// JWT PAYLOADS
	// ========================================================================
	
	/**
	 * Payload dentro del JWT de acceso (access token)
	 * Incluye claim is2FAVerified para validar 2FA
	 */
	export interface AccessTokenPayload extends UserPayload {
		is2FAVerified: boolean;
		iat: number;
		exp: number;
	}
	
	/**
	 * Payload dentro del JWT provisional (login con 2FA)
	 * TTL: 1 minuto
	 */
	export interface ProvisionalTokenPayload {
		userId: string;
		email: string;
		purpose: '2fa_verification';
		iat: number;
		exp: number;
	}
	
	/**
	 * Payload dentro del refresh token JWT
	 * Vinculado a registro en DB por tokenId
	 */
	export interface RefreshTokenPayload {
		userId: string;
		tokenId: string;
		is2FAVerified: boolean;
		iat: number;
		exp: number;
	}
	
	// ========================================================================
	// DATABASE ROWS (snake_case)
	// ========================================================================
	
	/**
	 * Refresh token en DB (snake_case)
	 * Tabla: refresh_tokens
	 */
	export interface RefreshTokenRow {
		id: string;
		user_id: string;
		token_hash: string;
		expires_at: number;			// Unix timestamp ms
		is_2fa_verified: number;	// SQLite boolean (0 | 1)
		created_at: number;			// Unix timestamp ms
	}
}