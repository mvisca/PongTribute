import { Type } from '@sinclair/typebox';

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
		minLength: 3,
		maxLength: 20,
		pattern: '^[a-zA-Z0-9_-]+$',
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
		minLength: 8,
		maxLength: 32,
		pattern: '^(?=.*[a-z])(?=.*\\d)[^\\s]+$',
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
			maxLength: 13_300_000,
			pattern: '^data:image\\/(png|jpg|jpeg|webp);base64,[A-Za-z0-9+/=]+$'
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
		minLength: 6,
		maxLength: 6,
		pattern: '^[0-9]{6}$'
	});

	export const BackupCodeField = Type.String({
		minLength: 9,
		maxLength: 9,
		pattern: '^[A-F0-9]{4}-[A-F0-9]{4}$'
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
