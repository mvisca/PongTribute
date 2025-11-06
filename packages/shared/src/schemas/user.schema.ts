import { Type } from '@sinclair/typebox';

// ============================================================================
// SCHEMAS DE BODY
// ============================================================================

export namespace UserSchemas { 
	/**
	* Body para POST /api/users
	* Valida datos de creacion de usuario
	*/
	export const CreateUserBody = Type.Object({
		username: Type.String({
			minLength: 3,
			maxLength: 20,
			pattern: '^[a-zA-Z0-9_-]+$',
			description: 'Username único, 3-20 char alphanum'
		}),
		email: Type.String({
			format: 'email',
			description: 'Email válido'		
		}),
		passwordHash: Type.String({
			minLength: 60,
			maxLength: 60,
			pattern: '^\\$2[aby]\\$\\d{2}\\$.{53}$',
			description: 'Password hashed by bcrypt'
		}),
		avatar: Type.String({
			format: 'uri',
			default: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
			description: 'URL del avatar del usuario'
		})
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
			format: 'uuid',
			description: 'ID única del usuario'
		}),
		username: Type.String(),
		email: Type.String({
			format: 'email'
		}),
		avatar: Type.String({
			format: 'uri'
		}),
		isOnline: Type.Boolean({
			description: 'Estado de conexion del usuario'
		}),
		isDeleted: Type.Boolean({
			description: 'Indica que usario ha sido anonimizado'
		}),
		createdAt: Type.String({
			format: 'date-time',
			description: 'Fecha de creación ISO 8601'
		}),
		updatedAt: Type.String({
			format: 'date-time',
			description: 'Fecha de última actualización ISO 8601'
		})
	});
	
	/**
	* Response para endpoints que retornan User
	* Con 'passwordHash' solo para uso interno (Repository, Auth)
	* NUNCA enviar a HTTP
	*/
	export const UserInternal = Type.Object({
		id: Type.String({
			format: 'uuid'
		}),
		username: Type.String(),
		email: Type.String({
			format: 'email'
		}),
		avatar: Type.String({
			format: 'uri'
		}),
		passwordHash: Type.String({
			minLength: 60,
			maxLength: 60
		}),
		isOnline: Type.Boolean(),
		isDeleted: Type.Boolean(),
		createdAt: Type.String({
			format: 'date-time'
		}),
		updatedAt: Type.String({
			format: 'date-time'
		})
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
		body: CreateUserBody,
		response: {
			201: UserPublic,
			409: Type.Object({
				error: Type.String(),
				message: Type.String(),
				field: Type.String()
			})
		}	
	};
	
	// ============================================================================
	// SCHEMAS DE PARAMS
	// ============================================================================
	
	/**
	* Params comunes para rutas con :id
	*/
	export const UserIdParams = Type.Object({
		id: Type.String({
			format: 'uuid',
			description: 'ID del usuario'
		})
	});
	
	/**
	* Params para ruta /users/username/:username
	*/
	export const UsernameParams = Type.Object({
		username: Type.String({
			minLength: 3,
			maxLength: 20,
			description: 'Username del usuario'
		})
	});
	
	/**
	* Params para ruta /users/email/:email
	*/
	export const EmailParams = Type.Object({
		email: Type.String({
			format: 'email',
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
			404: Type.Object({
				error: Type.String(),
				message: Type.String()
			})
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
			404: Type.Object({
				error: Type.String(),
				message: Type.String()
			})
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
			404: Type.Object({
				error: Type.String(),
				message: Type.String()
			})
		}
	};
	
	// ============================================================================
	// CHECK SCHEMAS
	// ============================================================================
	
	/**
	* Response para endpoints de verificación
	* Retorna disponibilidad del recurso
	*/
	const AvailabilityResponse = Type.Object({
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
		username: Type.Optional(Type.String({
			minLength: 3,
			maxLength: 20,
			pattern: '^[a-zA-Z0-9_-]+$'
		})),
		
		email: Type.Optional(Type.String({
			format: 'email'
		})),
		
		avatar: Type.Optional(Type.String({
			format: 'uri'
		}))
	}, {
		minProperties: 1, 
		description: 'Al menos un campo debe ser proporcionado'
	});
	
	/**
	* Schema para PUT /api/users/:id
	*/
	export const updateUserSchema = {
		description: 'Actualizar usuario',
		tags: ['User'],
		params: UserIdParams,
		body: UpdateUserBody,
		response: {
			200: UserPublic,
			404: Type.Object({
				error: Type.String(),
				message: Type.String()
			}),
			409: Type.Object({
				error: Type.String(),
				message: Type.String(),
				field: Type.String()
			})
		}
	};
	
	// ============================================================================
	// UPDATE PASSWORD SCHEMAS
	// ============================================================================
	
	/**
	* Body para PUT /api/users/:id/password
	*/
	export const UpdatePasswordBody = Type.Object({
		newPasswordHash: Type.String({
			minLength: 60,
			maxLength: 60,
			pattern: '^\\$2[aby]\\$\\d{2}\\$.{53}$',
			description: 'Nuevo hash bcrypt'
		})
	});
	
	/**
	* Schema para PUT /api/users/:id/password
	*/
	export const updatePasswordSchema = {
		description: 'Cambiar password de usuario',
		tags: ['User'],
		params: UserIdParams,
		body: UpdatePasswordBody,
		response: {
			204: Type.Null(),  // Sin contenido en respuesta exitosa
			404: Type.Object({
				error: Type.String(),
				message: Type.String()
			})
		}
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
			404: Type.Object({
				error: Type.String(),
				message: Type.String()
			})
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
			404: Type.Object({
				error: Type.String(),
				message: Type.String()
			})
		}
	};
}