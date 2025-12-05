import { Not, Optional, Type } from '@sinclair/typebox';
import { errorMonitor } from 'events';
import { errorCodes } from 'fastify';
import { urlToHttpOptions } from 'url';

// ============================================================================
// REUSABLE FIELD DEFINITIONS
// ============================================================================

const UsernameField = Type.String({
	minLength: 3,
	maxLength: 20,
	pattern: '^[a-zA-Z0-9_-]+$',
});

const EmailField = Type.String({
	format: 'email',
});

const PasswordField = Type.String({
	minLength: 8,
	maxLength: 32,
	pattern: '^(?=.*[a-z])(?=.*\\d).*$',
});

const UuidField = Type.String({
	format: 'uuid'
});

const BooleanField = Type.Boolean();

const DateTimeField = Type.String({
	format: 'date-time'
});

const SetupTokenField = Type.String({
	minLength: 20,
	maxLength: 500,
	pattern: "^[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+$"
}); 

const TotpCodeField = Type.String({
	minLength: 6,
	maxLength: 6
});

const RefreshTokenField = Type.String({
	minLength: 64,
	maxLength: 64
});

const BackupCodeField = Type.String({
	minLength: 8,
	maxLength: 8
});

const BackupCodeHashField = Type.String({
	minLength: 60,
	maxLength: 64,
	pattern: '^[A-HJ-NP-Z2-9]{8}$'
});

const LocalUserPayloadSchema = Type.Object({
	id: UuidField,
	username: UsernameField,
	email: EmailField,
	has2FAEnabled: BooleanField
});

// ============================================================================
// COMMON ERROR RESPONSES
// ============================================================================

const ErrorResponse = Type.Object({
	error: Type.String(),
	message: Type.String(),
	details: Type.Optional(
		Type.Object({
			setupToken: Type.String(),
			totpCode: Type.String()
		})
	)
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

const UnprocessableEntityError = Type.Object({
	error: Type.String(),
	message: Type.String(),
	retryAfter: Type.Number()
});

// ============================================================================
// SETUP & LOGIN SUCCESS / TwoFAVerify RESPONSES
// ============================================================================

const Enable2FASuccessResponse = Type.Null();

const LoginSuccessResponse = Type.Object({
	token: Type.String(),
	refreshToken: Type.String(),
	user: LocalUserPayloadSchema
});

const Login2FAVerifyResponse = Type.Object({
	twoFactorRequired: Type.Literal(true),
	userId: UuidField,
	setupToken: SetupTokenField,
	expiresIn: Type.Number(),
	qr: Type.Optional(Type.String()) // Solo en primer uso
})

export namespace AuthSchemas {
	
	// ========================================================================
	// COMUNES A TODOS
	// ========================================================================
	
	/** Datos del usuario en respuestas de auth */
	export const UserPayloadSchema = LocalUserPayloadSchema;
	
	/** Params para rutas con :id */
	export const UserIdParams = Type.Object({
		id: UuidField
	});

	// ========================================================================
	// 2FA Setup Body y Schema
	// ========================================================================
	
	/** Body con el token temporal y el código totp */
	export const Enable2FAResponse = Type.Object({
		setupToken: SetupTokenField,
		backupCode: BackupCodeField,
		qr: Type.String()
	});

	export const Verify2FABody = Type.Object({
		setupToken: SetupTokenField,
		totpCode: TotpCodeField
	});

	export const Verify2FABodySchema = {
		body: Verify2FABody,
		response: {
			200: ErrorResponse,
			401: ErrorResponse,
			409: ConflictErrorResponse,
			422: UnprocessableEntityError
		}
	}

	export const Verify2FABackupCodeBody = Type.Object({
		setupToken: SetupTokenField,
		backupCode: BackupCodeField
	});

	export const Verify2FABackupCodeBodySchema = {
		body: Verify2FABackupCodeBody,
		response: {
			200: Type.Union([
				LoginSuccessResponse,
				Login2FAVerifyResponse
			]),
			401: ErrorResponse
		}
	}

	export const Update2FAStatusBody = Type.Object({
		has2FAEnabled: BooleanField,
		totpSecret: Type.Optional(TotpCodeField),
		backupCodeHash: Type.Optional(BackupCodeHashField)
	});

	export const Update2FAStatusBodySchema = {
		body: Update2FAStatusBody,
		response: {
			204: Update2FAStatusBody,
			404: NotFoundResponse
		}
	}

	export const Disable2FABody = Type.Object({
		password: PasswordField
	});

	// ========================================================================
	// LOGIN Request - Body y Schema
	// ========================================================================
	
	/** Body: email + password */
	export const LoginBody = Type.Object({
		email: EmailField,
		password: PasswordField
	});
	
	/** Schema completo del endpoint */
	export const LoginBodySchema = {
		body: LoginBody,
		response: {
			200: Type.Union([
				LoginSuccessResponse,
				Login2FAVerifyResponse
			]),
			401: ErrorResponse
		}	
	};
	
	// ========================================================================
	// LOGIN - Response Body y Schema
	// ========================================================================
	
	/** Body para respuesta existosa de login w/2fa */
	export const AuthSuccessResponseBody = Type.Object({
		token: Type.String(),
		refreshToken: Type.String(),
		user: UserPayloadSchema
	});
	
	/** Body para respuesta de 2FA requerido */
	export const TwoFARequiredResponseBody = Type.Object({
		twoFactorRequired: Type.Literal(true),
		userId: Type.String(),
		setupToken: Type.String(),
		expiresIn: Type.Number()
	});
	
	/** Body union para login response */
	export const LoginResponseSchema = Type.Union([
		TwoFARequiredResponseBody,
		AuthSuccessResponseBody
	]);
	
	// ========================================================================
	// UPDATE PASSWORD - Body y Schema
	// ========================================================================
	
	/** Body: oldPassword + newPassword */
	export const UpdatePasswordBody = Type.Object({
		oldPassword: PasswordField,
		newPassword: PasswordField
	});
	
	/** Schema completo del endpoint */
	export const UpdatePasswordBodySchema = {
		tags: ['User'],
		params: UserIdParams,
		body: UpdatePasswordBody,
		response: {
			204: Type.Null(),
			404: NotFoundResponse
		}
	};
	
	// ========================================================================
	// REFRESH TOKEN - Body y Schema
	// ========================================================================

	/** Body: refreshToken */
	export const RefreshTokenBody = Type.Object({
		refreshToken: RefreshTokenField
	});
	
	/** Response: nuevo par de tokens + user */
	export const RefreshTokenResponse = Type.Object({
		token: Type.String(),
		refreshToken: RefreshTokenField,
		user: UserPayloadSchema
	});
	
	/** Schema completo del endpoint */
	export const RefreshTokenBodySchema = {
		tags: ['Auth'],
		body: RefreshTokenBody,
		response: {
			200: RefreshTokenResponse,
			401: ErrorResponse
		}
	};
	
	const TokenHashField = Type.String({
			description: 'Refresh Token hasheado',
			minLength: 64,
			maxLength: 64
	});

	/** Body para crear nuevo refresh token */
	export const RefreshTokenData = Type.Object({
		userId: UuidField,
		tokenHash: TokenHashField,
		expiresAt: DateTimeField,
		is2FAVerified: BooleanField
	})
	
	//** Body para respuesta de creacion de Refresh Token */
	export const RefreshTokenResponseBody = Type.Object({
		id: UuidField,
		userId: UuidField,
		tokenHash: TokenHashField,
		expiresAt: DateTimeField,
		is2FAVerified: BooleanField,
		createdAt: DateTimeField
	});
	
	/** Schema para creación de token */
	export const RefreshTokenDataSchema = {
		tags: ['Auth'],
		body: RefreshTokenData,
		response: {
			201: RefreshTokenResponseBody,
			400: ErrorResponse,
			500: ErrorResponse
		}
	};
	
	/** Body para verificar refresh token a partir de sí mismo */
	export const VerifyRefreshTokenBody = Type.Object({
		tokenHash: TokenHashField
	});
	
	/** Schema para verificar refresh token a partir de sí mismo */
	export const VerifyRefreshTokenSchema = {
		tags: ['Auth'],
		body: VerifyRefreshTokenBody,
		response: {
			200: RefreshTokenResponseBody,
			400: ErrorResponse,
			404: NotFoundResponse,
			500: ErrorResponse
		}
	};
	
	/** Params users/:id para borrar refresh token */
	export const DeleteRefreshTokenByUserParams = Type.Object({
		id: UuidField
	});
	
	export const DeleteRefreshTokenByUserSchema = {
		tags: ['Auth'],
		params: DeleteRefreshTokenByUserParams,
		response: {
			204: Type.Void(),
			400: ErrorResponse,
			500: ErrorResponse
		}
	};
	
	/** Schema para validar */
	export const DeleteExpiredTokensSchema = {
		tags: ['Auth'],
		response: {
			204: Type.Void(),
			500: ErrorResponse
		}
	}
}