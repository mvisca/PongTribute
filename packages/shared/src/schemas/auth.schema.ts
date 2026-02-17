import { Type } from '@sinclair/typebox';

// ============================================================================
// DEFINICION DE FIELDS REUSABLES
// ============================================================================

const UsernameField = Type.String({
	minLength: 3,
	maxLength: 20,
	pattern: '^[a-zA-Z0-9_-]+$',
});

const EmailField = Type.String({
	format: 'email',
});

const AvatarFieldBase64 = Type.Optional(
		Type.String({
			minLength: 1,
			maxLength: 13_300_000, // max 10MB
			pattern: '^data:image\\/(png|jpg|jpeg|webp);base64,[A-Za-z0-9+/=]+$'
		})
);

const AvatarFieldUrl = Type.Optional(
	Type.String({
		format: 'uri',
		pattern: '^https://res\\.cloudinary\\.com/',
		maxLength: 500
	})
);

const PasswordField = Type.String({
	minLength: 8,
	maxLength: 32,
	pattern: '^(?=.*[a-z])(?=.*\\d)[^\\s]+$',
});

const UuidField = Type.String({
	format: 'uuid'
});

const BooleanField = Type.Boolean();

const SecondsField = Type.Integer();

const SetupTokenField = Type.String({
	minLength: 64,
	maxLength: 64,
	pattern: '^[a-f0-9]{64}$'
});

const ProvisionalTokenField = Type.String({
	pattern: '^[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+$'
});

const AccessTokenField = Type.String({
	pattern: '^[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+$'
});

const TotpCodeField = Type.String({
	minLength: 6,
	maxLength: 6,
	pattern: '^[0-9]{6}$'
});

const RefreshTokenField = Type.String({
	minLength: 64,
	maxLength: 64
});

const BackupCodeField = Type.String({
	minLength: 9,
	maxLength: 9,
	pattern: '^[A-F0-9]{4}-[A-F0-9]{4}$'
});

const LocalUserPayloadObject = Type.Object({
	id: UuidField,
	username: UsernameField,
	email: EmailField,
	has2FAEnabled: BooleanField,
	is2FAVerified: BooleanField
});

// ============================================================================
// RESPUESTAS DE ERROR
// ============================================================================

const UnauthorizedError = Type.Object({
	error: Type.String(),
	message: Type.String(),
	details: Type.Optional(Type.Any())
});

const ConflictErrorResponse = Type.Object({
	error: Type.String(),
	message: Type.String(),
	field: Type.String()
});

const NotFoundResponse = Type.Object({
	error: Type.String(),
	message: Type.String()
});

// ============================================================================
// EXPORTACION DE SCHEMAS EN NAMESPACE AuthSchemas
// ============================================================================

export namespace AuthSchemas {
	
	export const UuidFieldEx = UuidField;
	export const BooleanFieldEx = BooleanField;
	export const UsernameFieldEx = UsernameField;
	export const EmailFieldEx = EmailField;

	// ========================================================================
	// COMUNES A TODOS
	// ========================================================================
	
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
			401: UnauthorizedError
		}
	};

	/** Schema para logout sin body */
	export const LogoutBodySchema = {
		tags: ['Auth'],
		response: { 
			204: Type.Null(),
			401: UnauthorizedError
		}
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
			401: UnauthorizedError,
			403: UnauthorizedError,
			404: NotFoundResponse
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
			401: UnauthorizedError,
			404: NotFoundResponse,
			409: ConflictErrorResponse
		}
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
			401: UnauthorizedError,
			404: NotFoundResponse
		}
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
			401: UnauthorizedError
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
			401: UnauthorizedError
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
			401: UnauthorizedError,
			404: NotFoundResponse
		}
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
			409: ConflictErrorResponse
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
			401: UnauthorizedError,
			404: NotFoundResponse
		}
	};

	// ========================================================================
	// PASSWORD RESET (EMAIL)
	// ========================================================================

	/** Body de POST /auth/password-reset/request */
	export const PasswordResetRequestBody = Type.Object({
		email: EmailField
	});

	/** Schema completo de POST /auth/password-reset/request */
	export const PasswordResetRequestBodySchema = {
		tags: ['Auth'],
		body: PasswordResetRequestBody,
		response: {
			204: Type.Null()
		}
	};

	/** Body de POST /auth/password-reset/confirm */
	export const PasswordResetConfirmBody = Type.Object({
		token: SetupTokenField,
		newPassword: PasswordField
	});

	/** Schema completo de POST /auth/password-reset/confirm */
	export const PasswordResetConfirmBodySchema = {
		tags: ['Auth'],
		body: PasswordResetConfirmBody,
		response: {
			204: Type.Null(),
			401: UnauthorizedError
		}
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
			401: UnauthorizedError
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