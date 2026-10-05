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
	PasswordField,
	PasswordHashField,
	AvatarFieldBase64,
	AvatarFieldUrl,
	UuidField,
	BooleanField,
	DateTimeField,
	SecondsField,
	TotpSecretField,
	BackupCodeHashField,
	TokenHashField,
} = SchemaFields;

// ============================================================================
// ERROR RESPONSES — importados de error.schema.ts (fuente única de verdad)
// Aliases locales para mantener legibilidad
// ============================================================================

const { Unauthorized, NotFound, Conflict, Validation, Internal } = ErrorSchemas;

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
		avatar: AvatarFieldUrl
	});

	/**
	* Body para POST /api/users
	* Valida datos de creacion de usuario
	*/
	export const CreateUserBody = Type.Object({
		id: UuidField,
		username: UsernameField,
		email: EmailField,
		passwordHash: Type.Optional(PasswordHashField),
		avatar: Type.Optional(AvatarFieldUrl),
		isOnline: Type.Boolean(),
		isDeleted: Type.Boolean(),
		has2FAEnabled: Type.Boolean(),
		totpSecret: Type.Optional(Type.String()),
		backupCodeHash: Type.Optional(Type.String()),
		authProvider: Type.Optional(Type.String()),
		oauthId: Type.Optional(Type.String()),
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
		avatar: AvatarFieldUrl,
		isOnline: Type.Boolean(),
		has2FAEnabled: Type.Boolean(),
		lastLogoutAt: SecondsField,
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
		avatar: Type.Optional(AvatarFieldUrl),
		passwordHash: Type.Optional(PasswordHashField),
		authProvider: Type.Optional(Type.String()),
		oauthId: Type.Optional(Type.String()),
		isOnline: BooleanField,
		isDeleted: BooleanField,
		has2FAEnabled: BooleanField,
		is2FAVerified: BooleanField,
		totpSecret: Type.Optional(TotpSecretField),
		backupCodeHash: Type.Optional(BackupCodeHashField),
		lastLogoutAt: SecondsField,
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
			409: Conflict
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
			404: NotFound
		},
		security: [{ bearerAuth: [] }]
	};

	/**
	* Schema para GET /api/users/username/:username
	*/
	export const getUserByUsernameSchema = {
		tags: ['User'],
		params: UsernameParams,
		response: {
			200: UserPublic,
			404: NotFound
		},
		security: [{ bearerAuth: [] }]
	};

	/**
	* Schema para GET /api/users/email/:email
	*/
	export const getUserByEmailSchema = {
		tags: ['User'],
		params: EmailParams,
		response: {
			200: UserPublic,
			404: NotFound
		},
		security: [{ bearerAuth: [] }]
	};

	export const getInternalUserByIdSchema = {
		tags: ['User'],
		params: UserIdParams,
		response: {
			200: UserInternal,
			404: NotFound
		}
	}

	export const getInternalUserByEmailSchema = {
		tags: ['User'],
		params: EmailParams,
		response: {
			200: UserInternal,
			404: NotFound
		}
	}

	/**
	* Schema para GET /internal/users/:id/friends
	*/
	export const getInternalFriendsSchema = {
		tags: ['User'],
		params: UserIdParams,
		response: {
			200: Type.Object({
				friendsIds: Type.Array(UuidField)
			}),
			404: NotFound
		}
	}

	/**
	* Schema para GET /internal/users/:id/last-logout
	*/
	export const getLastLogoutAtSchema = {
		tags: ['User'],
		params: UserIdParams,
		response: {
			200: Type.Object({
				lastLogoutAt: SecondsField
			}),
			404: NotFound
		}
	}

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
		avatar: Type.Optional(Type.Union([
			AvatarFieldBase64,
			Type.Null()	
		]))
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
			401: Unauthorized,
			404: NotFound,
			409: Conflict
		},
		security: [{ bearerAuth: [] }]
	};

	// ========================================================================
	// UPDATE PASSWORD SCHEMAS
	// ========================================================================

	/**
	* Body para PUT /api/users/:id/password
	*/
	export const UpdatePasswordInternalBody = Type.Object({
		passwordHash: PasswordHashField
	});

	/**
	 * Schema para PUT /internal/users/:id/password
	 */
	export const updatePasswordInternalSchema = {
		tags: ['User'],
		params: UserIdParams,
		body: Type.Object({
			passwordHash: PasswordHashField
		}),
		response: {
			204: Type.Null(),
			404: NotFound
		}
	}

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
			404: NotFound
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
		tags: ['User'],
		params: UserIdParams,
		body: Update2FAStatusBody,
		response: {
			200: UserPublic,
			404: NotFound
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
			400: Validation,
			500: Internal
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
			400: Validation,
			404: NotFound,
			500: Internal
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
			400: Validation,
			500: Internal
		}
	};

	/**
	* Schema completo de POST /internal/tokens/cleanup
	*/
	export const DeleteExpiredTokensSchema = {
		tags: ['Token'],
		response: {
			204: Type.Null(),
			500: Internal
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
			404: NotFound
		},
		security: [{ bearerAuth: [] }]
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
			404: NotFound
		},
		security: [{ bearerAuth: [] }]
	};
}