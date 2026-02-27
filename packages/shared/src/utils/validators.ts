import { ValidationConstants as VC } from '../constants/validation.constants.js';

export const Validators = {

	// Identidad
	username: {
		pattern:   new RegExp(VC.USERNAME_PATTERN),
		minLength: VC.USERNAME_MIN_LENGTH,
		maxLength: VC.USERNAME_MAX_LENGTH,
		message: 'Username: 3-20 chars, letters, numbers, _ and - only'
	},

	email: {
		pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
		message: 'Invalid email format'
	},

	// Credenciales
	password: {
		pattern:   new RegExp(VC.PASSWORD_PATTERN),
		minLength: VC.PASSWORD_MIN_LENGTH,
		maxLength: VC.PASSWORD_MAX_LENGTH,
		message: 'Password: 8-32 chars, at least one lowercase and one number, no spaces'
	},

	// Avatar base64
	avatarBase64: {
		pattern:      new RegExp(VC.AVATAR_BASE64_PATTERN),
		maxBytes:     VC.AVATAR_BASE64_MAX_LENGTH,
		allowedTypes: ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'],
		message: 'Avatar must be PNG, JPG or WEBP, max 10MB'
	},

	// 2FA
	totpCode: {
		pattern: new RegExp(VC.TOTP_CODE_PATTERN),
		message: '6-digit code required'
	},

	backupCode: {
		pattern: new RegExp(VC.BACKUP_CODE_PATTERN),
		message: 'Format: XXXX-XXXX (hex)'
	}
} as const;

// Helper genérico reutilizable
export function validate(value: string, rule: { pattern: RegExp; minLength?: number; maxLength?: number }): boolean {
	if (rule.minLength && value.length < rule.minLength) return false;
	if (rule.maxLength && value.length > rule.maxLength) return false;
	return rule.pattern.test(value);
}
