import { Type } from '@sinclair/typebox';

// ============================================================================
// REUSABLE FIELD DEFINITIONS
// ============================================================================

const UsernameField = Type.String({
	minLength: 3,
	maxLength: 20,
	pattern: '^[a-zA-Z0-9_-]+$',
	description: 'Username único, 3-20 char alphanum'
});

const EmailField = Type.String({
	format: 'email',
	description: 'Email válido'
});

const PasswordField = Type.String({
	minLength: 8,
	maxLength: 32,
	pattern: '^(?=.*[a-z])(?=.*\\d).*$',
	description: 'Min 8 char, max 32 char, min 1 lowercase, min 1 digit'
});

const PasswordHashField = Type.String({
	minLength: 60,
	maxLength: 60,
	pattern: '^\\$2[aby]\\$\\d{2}\\$.{53}$',
	description: 'Password hashed by bcrypt'
});

const AvatarField = Type.String({
	format: 'uri',
	description: 'URL del avatar del usuario'
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
		isOnline: Type.Boolean({
			description: 'Indica el status del usuario, se actualiza con login/logout'
		}),
		isDeleted: Type.Boolean({
			description: 'Indica si el usuario está activo o ha sido anonymizado'
		}),
		has2FAEnabled: Type.Boolean({
			description: 'Indica nivel de seguridad del usaurio 2FA on/off'
		}),
		totpSecret: Type.Optional(
			Type.String({
				description: 'Clave usara por HMAC para generar código'
			})
		)
	});
	
	// ============================================================================
	// SCHEMAS DE RESPONSE
	// ============================================================================
	
	/**
	* Response para endpoints que retornan User
	* Usuarion SIN passwordHass (por seguridad)
	*/
	export const UserPublic = Type.Object({
		id: Type.String({
			...UuidField,
			description: 'ID única del usuario'
		}),
		username: Type.String({
			description: 'Nombre del usuario'
		}),
		email: Type.String({
			...EmailField,
			description: 'Email del usuario'
		}),
		avatar: Type.String({
			...AvatarField,
			description: 'Avatar del usuario'
		}),
		isOnline: Type.Boolean({
			description: 'Estado de conexion del usuario'
		}),
		isDeleted: Type.Boolean({
			description: 'Indica que usario ha sido anonimizado'
		}),
		has2FAEnabled: Type.Boolean({
			description: 'Indica preferencia de 2FA del usuario'
		}),
		createdAt: Type.String({
			...DateTimeField,
			description: 'Fecha de creación ISO 8601'
		}),
		updatedAt: Type.String({
			...DateTimeField,
			description: 'Fecha de última actualización ISO 8601'
		})
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
	description: 'Crea nuevo usuario',
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
	id: Type.String({
		...UuidField,
		description: 'ID del usuario'
	})
	});

	/**
	* Params para ruta /users/username/:username
	*/
	export const UsernameParams = Type.Object({
	username: Type.String({
		...UsernameField,
		description: 'Username del usuario'
	})
	});

	/**
	* Params para ruta /users/email/:email
	*/
	export const EmailParams = Type.Object({
	email: Type.String({
		...EmailField,
		description: 'Email del usuario'
	})
	});

	// ============================================================================
	// GET SCHEMAS
	// ============================================================================

	/**
	* Schema para GET /api/users/:id
	*/
	export const getUserByIdSchema = {
	description: 'Obtener usuario por ID',
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
	description: 'Obtener usuario por username',
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
	description: 'Obtener usuario por email (interno)',
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
	available: Type.Boolean({
		description: 'true si está disponible, false si ya existe'
	}),
	username: Type.Optional(Type.String({
		description: 'Username verificado'
	})),
	email: Type.Optional(Type.String({
		description: 'Email verificado'
	}))
	});

	/**
	* Schema para GET /api/users/check-username/:username
	*/
	export const checkUsernameSchema = {
	description: 'Verificar disponibilidad de username',
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
	description: 'Verificar disponibilidad de email',
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
		description: 'Al menos un campo debe ser proporcionado'
	}
	);

	/**
	* Schema para PUT /api/users/:id
	*/
	export const UpdateUserSchema = {
	description: 'Actualizar usuario',
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
	description: 'Cambiar password de usuario',
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
	description: 'Update isOnline field in the user instance',
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
	description: 'Anonimizar usuario',
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
	description: 'Eliminar usuario',
	tags: ['User'],
	params: UserIdParams,
	response: {
		204: Type.Null(),
		404: NotFoundResponse
	}
	};
}