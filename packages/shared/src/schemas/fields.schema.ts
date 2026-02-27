import { Type } from '@sinclair/typebox';
import { ValidationConstants as VC } from '../constants/validation.constants.js';

// ============================================================================
// DEFINICIONES DE CAMPOS REUTILIZABLES — FUENTE ÚNICA DE VERDAD
// Todos los schemas que necesiten estos campos deben importarlos de aquí.
// ============================================================================

export namespace SchemaFields {

	// ====================================================================
	// IDENTIDAD
	// ====================================================================

	export const UuidField = Type.String({
		format: 'uuid'
	});

	export const UsernameField = Type.String({
		minLength: VC.USERNAME_MIN_LENGTH,
		maxLength: VC.USERNAME_MAX_LENGTH,
		pattern:   VC.USERNAME_PATTERN,
	});

	export const EmailField = Type.String({
		format: 'email',
	});

	// ====================================================================
	// CREDENCIALES
	// ====================================================================

	/** Password en texto claro (entrada del usuario).
	 *  Prohíbe espacios para evitar errores de copypaste.
	 */
	export const PasswordField = Type.String({
		minLength: VC.PASSWORD_MIN_LENGTH,
		maxLength: VC.PASSWORD_MAX_LENGTH,
		pattern:   VC.PASSWORD_PATTERN,
	});

	/** Hash bcrypt almacenado en DB (60 chars fijos). */
	export const PasswordHashField = Type.String({
		minLength: 60,
		maxLength: 60,
		pattern: '^\\$2[aby]\\$\\d{2}\\$.{53}$',
	});

	// ====================================================================
	// AVATAR
	// ====================================================================

	/** Avatar codificado en base64 (upload). Siempre Optional. */
	export const AvatarFieldBase64 = Type.Optional(
		Type.String({
			minLength: 1,
			maxLength: VC.AVATAR_BASE64_MAX_LENGTH,
			pattern:   VC.AVATAR_BASE64_PATTERN,
		})
	);

	/** URL pública de Cloudinary (lectura). Exportada como Required;
	 *  envolver en Type.Optional() localmente donde sea necesario.
	 */
	export const AvatarFieldUrl = Type.String({
		format: 'uri',
		pattern: '^https://res\\.cloudinary\\.com/',
		maxLength: 500
	});

	// ====================================================================
	// TIPOS PRIMITIVOS COMUNES
	// ====================================================================

	export const BooleanField = Type.Boolean();

	export const DateTimeField = Type.String({
		format: 'date-time'
	});

	export const SecondsField = Type.Integer();

	// ====================================================================
	// 2FA
	// ====================================================================

	export const TotpSecretField = Type.String({
		minLength: 16,
		maxLength: 64,
		pattern: '^[A-Z2-7]+$'
	});

	export const BackupCodeHashField = Type.String({
		minLength: 60,
		maxLength: 60,
		pattern: '^\\$2[ayb]\\$[0-9]{2}\\$[A-Za-z0-9./]{53}$'
	});

	export const TotpCodeField = Type.String({
		minLength: VC.TOTP_CODE_LENGTH,
		maxLength: VC.TOTP_CODE_LENGTH,
		pattern:   VC.TOTP_CODE_PATTERN,
	});

	export const BackupCodeField = Type.String({
		minLength: 9,
		maxLength: 9,
		pattern:   VC.BACKUP_CODE_PATTERN,
	});

	// ====================================================================
	// TOKENS
	// ====================================================================

	/** SHA-256 hash del refresh token (almacenado en DB). */
	export const TokenHashField = Type.String({
		description: 'Refresh Token hasheado (SHA-256)',
		minLength: 64,
		maxLength: 64
	});

	export const SetupTokenField = Type.String({
		minLength: 64,
		maxLength: 64,
		pattern: '^[a-f0-9]{64}$'
	});

	export const ProvisionalTokenField = Type.String({
		pattern: '^[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+$'
	});

	export const AccessTokenField = Type.String({
		pattern: '^[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+$'
	});

	export const RefreshTokenField = Type.String({
		minLength: 64,
		maxLength: 64
	});

	// ====================================================================
	// OBJETOS COMPUESTOS REUTILIZABLES
	// ====================================================================

	/** Payload mínimo de usuario presente en JWT y respuestas de Auth. */
	export const LocalUserPayloadObject = Type.Object({
		id: UuidField,
		username: UsernameField,
		email: EmailField,
		has2FAEnabled: BooleanField,
		is2FAVerified: BooleanField
	});
}
