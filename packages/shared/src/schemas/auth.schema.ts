import { Type } from '@sinclair/typebox';
import { ErrorSchemas } from './error.schema.js';
import { SchemaFields } from './fields.schema.js';

// ============================================================================
// REUSABLE FIELD DEFINITIONS — importados de fields.schema.ts
// Aliases locales para mantener legibilidad
// ============================================================================

const {
	UsernameField,
	EmailField,
	AvatarFieldBase64,
	PasswordField,
	UuidField,
	BooleanField,
	SecondsField,
	SetupTokenField,
	ProvisionalTokenField,
	AccessTokenField,
	TotpCodeField,
	RefreshTokenField,
	BackupCodeField,
	LocalUserPayloadObject,
} = SchemaFields;

// ============================================================================
// ERROR RESPONSES — importados de error.schema.ts (fuente única de verdad)
// Aliases locales para mantener legibilidad
// ============================================================================

const { Unauthorized, NotFound, Conflict } = ErrorSchemas;

// ============================================================================
// EXPORTACION DE SCHEMAS EN NAMESPACE AuthSchemas
// ============================================================================

export namespace AuthSchemas {

	/** Datos del usuario en respuestas de auth */
	export const UserPayloadSchema = LocalUserPayloadObject;

	/** Params para rutas con :id */
	export const UserIdParams = Type.Object({
		id: UuidField
	});

	// ========================================================================
	// LOGIN / LOGOUT - Body y Schemas
	// ========================================================================

	/** Body para login (email + password) */
	export const LoginBody = Type.Object({
		email: EmailField,
		password: PasswordField
	});

	/** Response: Login exitoso con tokens */
	export const LoginSuccessResponse = Type.Object({
		token: AccessTokenField,
		refreshToken: RefreshTokenField,
		user: LocalUserPayloadObject
	});

	/** Response: Login pendiente, requiere verificación 2FA */
	export const Login2FARequiredResponse = Type.Object({
		twoFactorRequired: Type.Literal(true),
		userId: UuidField,
		provisionalToken: ProvisionalTokenField,
		expiresIn: Type.Number()
	});

	/** Schema completo de POST /auth/login */
	export const LoginBodySchema = {
		tags: ['Auth'],
		body: LoginBody,
		response: {
			200: Type.Union([
				LoginSuccessResponse,
				Login2FARequiredResponse
			]),
			401: Unauthorized
		}
	};

	/** Schema para logout sin body */
	export const LogoutBodySchema = {
		tags: ['Auth'],
		response: {
			204: Type.Null(),
			401: Unauthorized
		},
		security: [{ bearerAuth: [] }]
	}

	export const LastLogoutAtBody = Type.Object({
		lastLogoutAt: SecondsField
	});

	export const UpdateLastLogoutAtSchema = {
		tags: ['Auth'],
		params: UserIdParams,
		body: LastLogoutAtBody,
		response: {
			204: Type.Null(),
			401: Unauthorized,
			403: Unauthorized,
			404: NotFound
		}
	}

	// ========================================================================
	// 2FA SETUP - Activar y Verificar 2FA
	// ========================================================================

	/** Response de POST /auth/:id/enable-2fa
	* Contiene QR code, setup token temporal y backup code
	* Usuario DEBE guardar backupCode (última vez que lo ve en plaintext)
	*/
	export const Enable2FAResponse = Type.Object({
		setupToken: SetupTokenField,
		backupCode: BackupCodeField,
		qr: Type.String()
	});

	/** Schema completo de POST /auth/:id/enable-2fa */
	export const Enable2FABodySchema = {
		tags: ['2FA'],
		params: UserIdParams,
		response: {
			200: Enable2FAResponse,
			401: Unauthorized,
			404: NotFound,
			409: Conflict
		},
		security: [{ bearerAuth: [] }]
	};

	/** Body de POST /auth/:id/verify-2fa-setup
	* Cliente envía setupToken + código TOTP de Google Authenticator
	*/
	export const Verify2FASetupBody = Type.Object({
		setupToken: SetupTokenField,
		totpCode: TotpCodeField
	});

	/** Schema completo de POST /auth/:id/verify-2fa-setup */
	export const Verify2FASetupBodySchema = {
		tags: ['2FA'],
		params: UserIdParams,
		body: Verify2FASetupBody,
		response: {
			200: LoginSuccessResponse,
			401: Unauthorized,
			404: NotFound
		},
		security: [{ bearerAuth: [] }]
	};

	// ========================================================================
	// 2FA LOGIN - Verificar código TOTP en login
	// ========================================================================

	/** Body de POST /auth/verify-2fa
	* Completar login cuando usuario tiene 2FA activo
	*/
	export const LoginVerify2FABody = Type.Object({
		provisionalToken: ProvisionalTokenField,
		totpCode: TotpCodeField
	});

	/** Schema completo de POST /auth/verify-2fa */
	export const LoginVerify2FABodySchema = {
		tags: ['2FA'],
		body: LoginVerify2FABody,
		response: {
			200: LoginSuccessResponse,
			401: Unauthorized
		}
	};

	// ========================================================================
	// 2FA RECOVERY - Backup Code (último recurso)
	// ========================================================================

	/** Body de POST /auth/verify-backup-code
	* Alternativa a verify-2fa cuando usuario pierde acceso a TOTP
	* IMPORTANTE: Al usarse, 2FA se desactiva automáticamente
	*/
	export const VerifyBackupCodeBody = Type.Object({
		provisionalToken: ProvisionalTokenField,
		backupCode: BackupCodeField
	});

	/** Schema completo de POST /auth/verify-backup-code */
	export const VerifyBackupCodeBodySchema = {
		tags: ['2FA'],
		body: VerifyBackupCodeBody,
		response: {
			200: LoginSuccessResponse,
			401: Unauthorized
		}
	};

	// ========================================================================
	// 2FA DISABLE - Desactivar 2FA
	// ========================================================================

	/** Body de POST /auth/:id/disable-2fa
	* Requiere password actual para seguridad
	*/
	export const Disable2FABody = Type.Object({
		password: PasswordField
	});

	/** Schema completo de POST /auth/:id/disable-2fa */
	export const Disable2FABodySchema = {
		tags: ['2FA'],
		params: UserIdParams,
		body: Disable2FABody,
		response: {
			200: LoginSuccessResponse,
			401: Unauthorized,
			404: NotFound
		},
		security: [{ bearerAuth: [] }]
	};

	// ========================================================================
	// CREATE USER - Body y Schemas
	// ========================================================================

	/** Body de POST /api/auth/register */
	export const RegisterBody = Type.Object({
		username: UsernameField,
		email: EmailField,
		password: PasswordField,
		avatar: AvatarFieldBase64
	});

	/** Schema completo de POST /api/auth/register */
	export const RegisterBodySchema = {
		tags: ['Auth'],
		body: RegisterBody,
		response: {
			201: LoginSuccessResponse,
			409: Conflict
		}
	};

	// ========================================================================
	// UPDATE PASSWORD
	// ========================================================================

	/** Body de POST /auth/:id/update-password */
	export const UpdatePasswordBody = Type.Object({
		oldPassword: PasswordField,
		newPassword: PasswordField
	});

	/** Schema completo de POST /auth/:id/update-password */
	export const UpdatePasswordBodySchema = {
		tags: ['Auth'],
		params: UserIdParams,
		body: UpdatePasswordBody,
		response: {
			204: Type.Null(),
			401: Unauthorized,
			404: NotFound
		},
		security: [{ bearerAuth: [] }]
	};

	// ========================================================================
	// REFRESH TOKEN - Cliente HTTP
	// ========================================================================

	/** Body de POST /auth/refresh */
	export const RefreshTokenBody = Type.Object({
		refreshToken: RefreshTokenField
	});

	/** Response de POST /auth/refresh (nuevo par de tokens) */
	export const RefreshTokenResponse = Type.Object({
		token: AccessTokenField,
		refreshToken: RefreshTokenField,
		user: LocalUserPayloadObject
	});

	/** Schema completo de POST /auth/refresh */
	export const RefreshTokenBodySchema = {
		tags: ['Auth'],
		body: RefreshTokenBody,
		response: {
			200: RefreshTokenResponse,
			401: Unauthorized
		}
	};

	// ========================================================================
	// ACCESS TOKEN PAYLOAD SCHEMA
	// ========================================================================

	/**
	 * Schema base para el payload de un JWT estándar en el sistema
	 * Contiene los campos necesarios para authorizacion e identificación de usuario
	 */
	export const AccessTokenPayloadSchema = Type.Object({
		id: UuidField,
		username: UsernameField,
		email: EmailField,
		has2FAEnabled: BooleanField,
		is2FAVerified: BooleanField,
		iat: Type.Optional(Type.Integer()),
		exp: Type.Optional(Type.Integer())
	});

	export const AccessTokenPayloadUntypedSchema = Type.Object({
		id: Type.String(),
		username: UsernameField,
		email: Type.String(),
		has2FAEnabled: BooleanField,
		is2FAVerified: BooleanField,
		iat: Type.Optional(Type.Integer()),
		exp: Type.Optional(Type.Integer())
	})
}