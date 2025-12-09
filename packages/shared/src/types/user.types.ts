import { Static } from '@sinclair/typebox';
import { UserSchemas } from '../schemas/user.schema.js';

export namespace UserTypes {
	
	// ========================================================================
	// DATABASE ROW (snake_case)
	// ========================================================================
	
	/**
	 * User en DB (snake_case)
	 * Tabla: users
	 */
	export type UserRow = {
		id: string;
		username: string;
		email: string;
		avatar: string;
		password_hash: string;
		is_online: number;
		is_deleted: number;
		has_2fa_enabled: number;
		totp_secret: string | null;
		backup_code_hash: string | null;
		created_at: number;
		updated_at: number;
	};
	
	// ========================================================================
	// USER - CRUD
	// ========================================================================
	
	export type CreateUserInput = Static<typeof UserSchemas.CreateUserInput>;
	export type CreateUserBody = Static<typeof UserSchemas.CreateUserBody>;
	export type UpdateUserBody = Static<typeof UserSchemas.UpdateUserBody>;
	export type UpdatePasswordInternalBody = Static<typeof UserSchemas.UpdatePasswordInternalBody>;
	export type UserPublic = Static<typeof UserSchemas.UserPublic>;
	export type UserInternal = Static<typeof UserSchemas.UserInternal>;
	
	// ========================================================================
	// USER - PARAMS
	// ========================================================================
	
	export type UserIdParams = Static<typeof UserSchemas.UserIdParams>;
	export type UsernameParams = Static<typeof UserSchemas.UsernameParams>;
	export type EmailParams = Static<typeof UserSchemas.EmailParams>;
	
	// ========================================================================
	// USER - AVAILABILITY
	// ========================================================================
	
	export type AvailabilityResponse = Static<typeof UserSchemas.AvailabilityResponse>;
	
	// ========================================================================
	// USER - ONLINE STATUS
	// ========================================================================
	
	export type SetOnlineStatusBody = Static<typeof UserSchemas.SetOnlineStatusBody>;
	
	// ========================================================================
	// 2FA INTERNAL - User EXPONE (llamado por Auth)
	// ========================================================================
	
	export type Update2FAStatusBody = Static<typeof UserSchemas.Update2FAStatusBody>;
	
	// ========================================================================
	// REFRESH TOKEN - User EXPONE (llamado por Auth)
	// ========================================================================
	
	export type RefreshTokenData = Static<typeof UserSchemas.RefreshTokenData>;
	export type RefreshTokenResponseBody = Static<typeof UserSchemas.RefreshTokenResponseBody>;
	export type VerifyRefreshTokenBody = Static<typeof UserSchemas.VerifyRefreshTokenBody>;
	export type DeleteRefreshTokenByUserParams = Static<typeof UserSchemas.DeleteRefreshTokenByUserParams>;
	
	// ========================================================================
	// REFRESH TOKEN - DATABASE ROW (snake_case)
	// ========================================================================
	
	/**
	 * Refresh token en DB (snake_case)
	 * Tabla: refresh_tokens
	 */
	export type RefreshTokenRow = {
		id: string;
		user_id: string;
		token_hash: string;
		expires_at: number;        // Unix timestamp ms
		is_2fa_verified: number;   // SQLite boolean (0 | 1)
		created_at: number;        // Unix timestamp ms
	};
}