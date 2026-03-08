// ============================================================================
// VALIDATION CONSTANTS — FUENTE ÚNICA DE VERDAD
// Consumido por: schemas/fields.schema.ts (TypeBox/AJV) y utils/validators.ts (runtime)
// ============================================================================

export namespace ValidationConstants {

	// ====================================================================
	// IDENTIDAD
	// ====================================================================

	export const USERNAME_MIN_LENGTH = 3;
	export const USERNAME_MAX_LENGTH = 20;
	export const USERNAME_PATTERN    = '^[a-zA-Z0-9_-]+$';

	// ====================================================================
	// CREDENCIALES
	// ====================================================================

	export const PASSWORD_MIN_LENGTH = 8;
	export const PASSWORD_MAX_LENGTH = 32;
	/** Al menos una mayuscula, una minúscula, un dígito, sin espacios. */
	export const PASSWORD_PATTERN    = '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[^\\s]+$';

	// ====================================================================
	// AVATAR
	// ====================================================================

	/** Límite en bytes (~10 MB en base64). */
	export const AVATAR_BASE64_MAX_LENGTH = 13_300_000;
	export const AVATAR_BASE64_PATTERN    = '^data:image\\/(png|jpg|jpeg|webp);base64,[A-Za-z0-9+/=]+$';

	// ====================================================================
	// 2FA
	// ====================================================================

	export const TOTP_CODE_LENGTH  = 6;
	export const TOTP_CODE_PATTERN = '^[0-9]{6}$';

	export const BACKUP_CODE_PATTERN = '^[A-F0-9]{4}-[A-F0-9]{4}$';
}
