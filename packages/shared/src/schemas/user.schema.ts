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

const AvatarField = Type.String({
	format: 'uri',
});

const UuidField = Type.String({
	format: 'uuid'
});

const BooleanField = Type.Boolean();

const DateTimeField = Type.String({
	format: 'date-time'
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
	
	// ============================================================================
	// SCHEMAS DE RESPONSE
	// ============================================================================
	
	/**
	* Response para endpoints que retornan User
	* Usuarion SIN passwordHass (por seguridad)
	*/
	export const UserPublic = Type.Object({
		id: Type.String({ ...UuidField }),
		username: Type.String({ ...UsernameField }),
		email: Type.String({ ...EmailField }),
		avatar: Type.String({ ...AvatarField }),
		isOnline: Type.Boolean(),
		has2FAEnabled: Type.Boolean(),
		createdAt: Type.String({ ...DateTimeField }),
		updatedAt: Type.String({ ...DateTimeField })
	});
	
	/**
	* Response para endpoints que retornan User
	* Con 'passwordHash' solo para uso interno (Repository, Auth)
	* NUNCA enviar a HTTP
	*/
	export const UserInternal = Type.Object({
		id: UuidField,
		username: Type.String(),
		email: EmailField,
		avatar: AvatarField,
		passwordHash: PasswordHashField,
		isOnline: BooleanField,
		isDeleted: BooleanField,
		has2FAEnabled: BooleanField,
		totpSecret: Type.Optional(Type.String()),
		backupCodeHash: Type.Optional(Type.String()),
		createdAt: DateTimeField,
		updatedAt: DateTimeField
	});
	
	// ============================================================================
	// SCHEMAS COMPLETOS PARA FATIFY RUTA 'POST /api/user'
	// ============================================================================
	
	/**
	* Schema competo para POST /api/users
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
	
	// ============================================================================
	// SCHEMAS DE PARAMS
	// ============================================================================
	
	/**
	* Params comunes para rutas con :id
	* Note: Also defined in auth.schema.ts - intentionally duplicated for namespace organization
	*/
	export const UserIdParams = Type.Object({
		id: Type.String({ ...UuidField })
	});
	
	/**
	* Params para ruta /users/username/:username
	*/
	export const UsernameParams = Type.Object({
		username: Type.String({ ...UsernameField })
	});
	
	/**
	* Params para ruta /users/email/:email
	*/
	export const EmailParams = Type.Object({
		email: Type.String({
			...EmailField,
		})
	});
	
	// ============================================================================
	// GET SCHEMAS
	// ============================================================================
	
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
	
	// ============================================================================
	// CHECK SCHEMAS
	// ============================================================================
	
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
	
	// ============================================================================
	// UPDATE USER SCHEMAS
	// ============================================================================
	
	/**
	* Body para PUT /api/users/:id
	* Todos los campos son opcionales (actualización parcial)
	*/
	export const UpdateUserBody = Type.Object({
		username: Type.Optional(UsernameField),
		email: Type.Optional(EmailField),
		avatar: Type.Optional(AvatarField)
	}, {
		minProperties: 1,
	}
);

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

// ============================================================================
// UPDATE PASSWORD SCHEMAS
// ============================================================================

/**
* Body para PUT /api/users/:id/password
*/
export const UpdatePasswordInternalBody = Type.Object({
	newPasswordHash: Type.String({
		...PasswordHashField,
		description: 'Nuevo hash bcrypt'
	})
});

/**
* Schema para PUT /api/users/:id/password
*/
export const updatePasswordInternalSchema = {
	tags: ['User'],
	params: UserIdParams,
	body: UpdatePasswordInternalBody,
	response: {
		204: Type.Null(),  // Sin contenido en respuesta exitosa
		404: NotFoundResponse
	}
};

// ============================================================================
// SET ONLINE STATUS SCHEMA
// ============================================================================

export const setOnlineStatusSchema = {
	tags: ['user'],
	params: Type.Object({
		id: UuidField
	}),
	body: Type.Object({
		isOnline: BooleanField
	}),
	response: Type.Object({
		204: Type.Null()
	})
};

// ============================================================================
// ANONYMIZE SCHEMAS
// ============================================================================

/**
* Schema para DELETE /api/users/:id
*/
export const anonymizeUserSchema = {
	tags: ['User'],
	params: UserIdParams,
	response: {
		204: Type.Null(),
		404: NotFoundResponse
	}
};

// ============================================================================
// DELETE SCHEMAS
// ============================================================================

/**
* Schema para DELETE /api/users/:id
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