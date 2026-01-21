import { Type } from '@sinclair/typebox';

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

const PasswordHashField = Type.String({
	minLength: 60,
	maxLength: 60,
	pattern: '^\\$2[aby]\\$\\d{2}\\$.{53}$',
});

const AvatarField = Type.Optional(Type.String({
	minLength: 1,
	maxLength: 13_300_000, // max 10MB
	pattern: '^data:image\\/(png|jpg|jpeg|webp);base64,[A-Za-z0-9+/=]+$'
}));

const UuidField = Type.String({
	format: 'uuid'
});

const BooleanField = Type.Boolean();

const DateTimeField = Type.String({
	format: 'date-time'
});

const TotpSecretField = Type.String({
	minLength: 16,
	maxLength: 64,
	pattern: '^[A-Z2-7]+$'
});

const BackupCodeHashField = Type.String({
	minLength: 60,
	maxLength: 60,
	pattern: '^\\$2[ayb]\\$[0-9]{2}\\$[A-Za-z0-9./]{53}$'
});

const TokenHashField = Type.String({
	description: 'Refresh Token hasheado (SHA-256)',
	minLength: 64,
	maxLength: 64
});

// ============================================================================
// COMMON ERROR RESPONSES
// ============================================================================

const ErrorResponse = Type.Object({
	error: Type.String(),
	message: Type.String()
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
// SCHEMAS DE BODY
// ============================================================================

export namespace UserSchemas {
	
	// ========================================================================
	// USER CREATION
	// ========================================================================
	
	export const CreateUserInput = Type.Object({
		username: UsernameField,
		email: EmailField,
		password: PasswordField,
		avatar: AvatarField
	});
	
	/**
	 * Body para POST /api/users
	 * Valida datos de creacion de usuario
	 */
	export const CreateUserBody = Type.Object({
		id: UuidField,
		username: UsernameField,
		email: EmailField,
		passwordHash: PasswordHashField,
		avatar: AvatarField,
		isOnline: Type.Boolean(),
		isDeleted: Type.Boolean(),
		has2FAEnabled: Type.Boolean(),
		totpSecret: Type.Optional(Type.String()),
		backupCodeHash: Type.Optional(Type.String())
	});
	
	// ========================================================================
	// SCHEMAS DE RESPONSE
	// ========================================================================
	
	/**
	 * Response para endpoints que retornan User
	 * Usuario SIN passwordHash (por seguridad)
	 */
	export const UserPublic = Type.Object({
		id: UuidField,
		username: UsernameField,
		email: EmailField,
		avatar: AvatarField,
		isOnline: Type.Boolean(),
		has2FAEnabled: Type.Boolean(),
		lastLogoutAt: DateTimeField,
		createdAt: DateTimeField,
		updatedAt: DateTimeField
	});
	
	/**
	 * Response para endpoints que retornan User
	 * Con 'passwordHash' solo para uso interno (Repository, Auth)
	 * NUNCA enviar a HTTP
	 */
	export const UserInternal = Type.Object({
		id: UuidField,
		username: UsernameField,
		email: EmailField,
		avatar: AvatarField,
		passwordHash: PasswordHashField,
		isOnline: BooleanField,
		isDeleted: BooleanField,
		has2FAEnabled: BooleanField,
		is2FAVerified: BooleanField,
		totpSecret: Type.Optional(TotpSecretField),
		backupCodeHash: Type.Optional(BackupCodeHashField),
		lastLogoutAt: DateTimeField,
		createdAt: DateTimeField,
		updatedAt: DateTimeField
	});
	
	// ========================================================================
	// SCHEMAS COMPLETOS PARA FASTIFY RUTA 'POST /api/user'
	// ========================================================================
	
	/**
	 * Schema completo para POST /api/users
	 * Define el body de entrada y responses posibles
	 */
	export const createUserSchema = {
		tags: ['User'],
		body: CreateUserInput,
		response: {
			201: UserPublic,
			409: ConflictErrorResponse
		}
	};
	
	// ========================================================================
	// SCHEMAS DE PARAMS
	// ========================================================================
	
	/**
	 * Params comunes para rutas con :id
	 */
	export const UserIdParams = Type.Object({
		id: UuidField
	});
	
	/**
	 * Params para ruta /users/username/:username
	 */
	export const UsernameParams = Type.Object({
		username: UsernameField
	});
	
	/**
	 * Params para ruta /users/email/:email
	 */
	export const EmailParams = Type.Object({
		email: EmailField
	});
	
	// ========================================================================
	// GET SCHEMAS
	// ========================================================================
	
	/**
	 * Schema para GET /api/users/:id
	 */
	export const getUserByIdSchema = {
		tags: ['User'],
		params: UserIdParams,
		response: {
			200: UserPublic,
			404: NotFoundResponse
		}
	};
	
	/**
	 * Schema para GET /api/users/username/:username
	 */
	export const getUserByUsernameSchema = {
		tags: ['User'],
		params: UsernameParams,
		response: {
			200: UserPublic,
			404: NotFoundResponse
		}
	};
	
	/**
	 * Schema para GET /api/users/email/:email
	 */
	export const getUserByEmailSchema = {
		tags: ['User'],
		params: EmailParams,
		response: {
			200: UserPublic,
			404: NotFoundResponse
		}
	};
	
	/**------joan------no lo tengo muy claro
	 * Schema para GET /users/me
	 * No requiere params (el ID viene del JWT)
	 */
	export const getMeSchema = {
		tags: ['User'],
		response: {
			200: UserPublic,
			401: ErrorResponse,
			404: NotFoundResponse
		}
	};


	// ========================================================================
	// CHECK SCHEMAS
	// ========================================================================
	
	/**
	 * Response para endpoints de verificación
	 * Retorna disponibilidad del recurso
	 */
	export const AvailabilityResponse = Type.Object({
		available: Type.Boolean(),
		username: Type.Optional(Type.String()),
		email: Type.Optional(Type.String())
	});
	
	/**
	 * Schema para GET /api/users/check-username/:username
	 */
	export const checkUsernameSchema = {
		tags: ['User'],
		params: UsernameParams,
		response: {
			200: AvailabilityResponse
		}
	};
	
	/**
	 * Schema para GET /api/users/check-email/:email
	 */
	export const checkEmailSchema = {
		tags: ['User'],
		params: EmailParams,
		response: {
			200: AvailabilityResponse
		}
	};
	
	// ========================================================================
	// UPDATE USER SCHEMAS
	// ========================================================================
	
	/**
	 * Body para PUT /api/users/:id
	 * Todos los campos son opcionales (actualización parcial)
	 */
	export const UpdateUserBody = Type.Object({
		username: Type.Optional(UsernameField),
		email: Type.Optional(EmailField),
		avatar: Type.Optional(AvatarField)
	}, {
		minProperties: 1
	});

	/**
	 * Schema para PUT /api/users/:id
	 */
	export const UpdateUserSchema = {
		tags: ['User'],
		params: UserIdParams,
		body: UpdateUserBody,
		response: {
			200: UserPublic,
			404: NotFoundResponse,
			409: ConflictErrorResponse
		}
	};

	// ========================================================================
	// UPDATE PASSWORD SCHEMAS
	// ========================================================================

	/**
	 * Body para PUT /api/users/:id/password
	 */
	export const UpdatePasswordInternalBody = Type.Object({
		newPasswordHash: PasswordHashField
	});

	/**
	 * Schema para PUT /api/users/:id/password
	 */
	export const updatePasswordInternalSchema = {
		tags: ['User'],
		params: UserIdParams,
		body: UpdatePasswordInternalBody,
		response: {
			204: Type.Null(),
			404: NotFoundResponse
		}
	};

	// ========================================================================
	// SET ONLINE STATUS SCHEMA
	// ========================================================================

	/**
	 * Body para PATCH /internal/users/:id/online-status
	 */
	export const SetOnlineStatusBody = Type.Object({
		isOnline: BooleanField
	});

	/**
	 * Schema para PATCH /internal/users/:id/online-status
	 */
	export const setOnlineStatusSchema = {
		tags: ['User'],
		params: UserIdParams,
		body: SetOnlineStatusBody,
		response: {
			204: Type.Null(),
			404: NotFoundResponse
		}
	};

	// ========================================================================
	// 2FA INTERNAL - Endpoint interno desde Auth
	// ========================================================================
	
	/**
	 * Body de PATCH /internal/users/:id/2fa-status
	 * Llamado por Auth service para actualizar estado 2FA en DB
	 */
	export const Update2FAStatusBody = Type.Object({
		has2FAEnabled: BooleanField,
		totpSecret: Type.Optional(TotpSecretField),
		backupCodeHash: Type.Optional(BackupCodeHashField)
	});
	
	/**
	 * Schema completo de PATCH /internal/users/:id/2fa-status
	 */
	export const Update2FAStatusBodySchema = {
		description: "Actualiza activación/desactivación de 2FA",
		tags:['User'],
		params: UserIdParams,
		body: Update2FAStatusBody,
		response: {
			200: UserPublic,
			404: NotFoundResponse
		}
	};

	// ========================================================================
	// REFRESH TOKEN - Internos (llamados desde Auth)
	// ========================================================================

	/**
	 * Body de POST /internal/tokens (crear refresh token)
	 */
	export const RefreshTokenData = Type.Object({
		userId: UuidField,
		tokenHash: TokenHashField,
		expiresAt: DateTimeField,
		is2FAVerified: BooleanField
	});
	
	/**
	 * Response al crear o verificar refresh token
	 */
	export const RefreshTokenResponseBody = Type.Object({
		id: UuidField,
		userId: UuidField,
		tokenHash: TokenHashField,
		expiresAt: DateTimeField,
		is2FAVerified: BooleanField,
		createdAt: DateTimeField
	});
	
	/**
	 * Schema completo de POST /internal/tokens
	 */
	export const RefreshTokenDataSchema = {
		tags: ['Token'],
		body: RefreshTokenData,
		response: {
			201: RefreshTokenResponseBody,
			400: ErrorResponse,
			500: ErrorResponse
		}
	};
	
	/**
	 * Body de POST /internal/tokens/verify
	 */
	export const VerifyRefreshTokenBody = Type.Object({
		tokenHash: TokenHashField
	});
	
	/**
	 * Schema completo de POST /internal/tokens/verify
	 */
	export const VerifyRefreshTokenSchema = {
		tags: ['Token'],
		body: VerifyRefreshTokenBody,
		response: {
			200: RefreshTokenResponseBody,
			400: ErrorResponse,
			404: NotFoundResponse,
			500: ErrorResponse
		}
	};
	
	/**
	 * Params de DELETE /internal/tokens/user/:id
	 */
	export const DeleteRefreshTokenByUserParams = Type.Object({
		id: UuidField
	});
	
	/**
	 * Schema completo de DELETE /internal/tokens/user/:id
	 */
	export const DeleteRefreshTokenByUserSchema = {
		tags: ['Token'],
		params: DeleteRefreshTokenByUserParams,
		response: {
			204: Type.Null(),
			400: ErrorResponse,
			500: ErrorResponse
		}
	};
	
	/**
	 * Schema completo de POST /internal/tokens/cleanup
	 */
	export const DeleteExpiredTokensSchema = {
		tags: ['Token'],
		response: {
			204: Type.Null(),
			500: ErrorResponse
		}
	};

	// ========================================================================
	// ANONYMIZE SCHEMAS
	// ========================================================================

	/**
	 * Schema para DELETE /api/users/:id (soft delete)
	 */
	export const anonymizeUserSchema = {
		tags: ['User'],
		params: UserIdParams,
		response: {
			204: Type.Null(),
			404: NotFoundResponse
		}
	};

	// ========================================================================
	// DELETE SCHEMAS
	// ========================================================================

	/**
	 * Schema para DELETE /api/users/:id (hard delete)
	 */
	export const deleteUserSchema = {
		tags: ['User'],
		params: UserIdParams,
		response: {
			204: Type.Null(),
			404: NotFoundResponse
		}
	};
}