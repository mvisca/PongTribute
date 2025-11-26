import { Type } from '@sinclair/typebox';
import { deserialize } from 'v8';

export namespace AuthSchemas {
	
	// ========================================================================
	// COMUNES A TODOS
	// ========================================================================
	
	/** Datos del usuario en respuestas de auth */
	export const UserPayloadSchema = Type.Object({
		id: Type.String(),
		username: Type.String(),
		email: Type.String()
	});
	
	/** Params para rutas con :id */
	export const UserIdParams = Type.Object({
		id: Type.String({
			format: 'uuid',
			description: 'ID del usuario'
		})
	});
	
	// ========================================================================
	// LOGIN - Body y Schema
	// ========================================================================
	
	/** Body: email + password */
	export const LoginBody = Type.Object({
		email: Type.String({ format: 'email' }),
		password: Type.String({ minLength: 8 })
	});
	
	/** Schema completo del endpoint */
	export const LoginBodySchema = {
		body: LoginBody,
		response: {
			200: Type.Object({
				token: Type.String(),
				user: UserPayloadSchema
			}),
			401: Type.Object({
				error: Type.String(),
				message: Type.String()
			})
		}	
	};
	
	// ========================================================================
	// UPDATE PASSWORD - Body y Schema
	// ========================================================================
	
	/** Body: oldPassword + newPassword */
	export const UpdatePasswordBody = Type.Object({
		oldPassword: Type.String({
			minLength: 8,
			maxLength: 32,
			pattern: '^(?=.*[a-z])(?=.*\\d).*$',
			description: 'Min 8 char, max 32 char, min 1 lowercase, min 1 digit'
		}),
		newPassword: Type.String({
			minLength: 8,
			maxLength: 32,
			pattern: '^(?=.*[a-z])(?=.*\\d).*$',
			description: 'Min 8 char, max 32 char, min 1 lowercase, min 1 digit'
		})
	});
	
	/** Schema completo del endpoint */
	export const UpdatePasswordBodySchema = {
		description: 'Cambiar password de usuario',
		tags: ['User'],
		params: UserIdParams,
		body: UpdatePasswordBody,
		response: {
			204: Type.Null(),
			404: Type.Object({
				error: Type.String(),
				message: Type.String()
			})
		}
	};
	
	// ========================================================================
	// REFRESH TOKEN - Body y Schema
	// ========================================================================
	
	/** Body: refreshToken */
	export const RefreshTokenBody = Type.Object({
		refreshToken: Type.String({
			minLength: 64,
			maxLength: 64,
			description: 'Refresh token JWT válido'
		})
	});
	
	/** Response: nuevo par de tokens + user */
	export const RefreshTokenResponse = Type.Object({
		token: Type.String({
			description: 'Nuevo access token JWT (.env define)'
		}),
		refreshToken: Type.String({
			description: 'Nuevo refresh token JWT (.env define)'
		}),
		user: UserPayloadSchema
	});
	
	/** Schema completo del endpoint */
	export const RefreshTokenBodySchema = {
		description: 'Renovar tokens de autenticación',
		tags: ['Auth'],
		body: RefreshTokenBody,
		response: {
			200: RefreshTokenResponse,
			401: Type.Object({
				error: Type.String(),
				message: Type.String()
			})
		}
	};
	
	/** Body para crear nuevo refresh token */
	export const RefreshTokenDataBody = Type.Object({
		userId: Type.String({
			description: 'Id del usuario dueño del refresh token',
			format: 'uuid'
		}),
		tokenHash: Type.String({
			description: 'Refresh Token hasheado',
			minLength: 64,
			maxLength: 64
		}),
		expiresAt: Type.String({
			description: 'Tiempo de utilidad del refresh token',
			format: 'date-time'
		}),
		is2FAVerified: Type.Boolean({
			description: 'Se ha completado el 2FA o no'
		})
	})
	
	//** Body para respuesta de creacion de Refresh Token */
	export const RefreshTokenResponseBody = Type.Object({
		id: Type.String({
			format: 'uuid',
			description: 'ID del Refresh Token'
		}),
		userId: Type.String({
			format: 'uuid',
			description: 'Id del usuario dueño del refresh token'
		}),
		tokenHash: Type.String({
			description: 'Refresh Token hasheado'
		}),
		expiresAt: Type.String({
			format: 'date-time',
			description: 'Tiempo de utilidad del refresh token'
		}),
		is2FAVerified: Type.Boolean({
			description: 'Se ha completado el 2FA o no'
		}),
		createdAt: Type.String({
			format: 'date-time',
			description: 'Fecha de creación'
		})
	});
	
	/** Schema para creación de token */
	export const RefreshTokenDataSchema = {
		description: 'Datos para crear un nuevo Refresh Token',
		tags: ['Auth'],
		body: RefreshTokenDataBody,
		response: {
			201: RefreshTokenResponseBody,
			400: Type.Object({
				error: Type.String(),
				message: Type.String()
			}),
			500: Type.Object({
				error: Type.String(),
				message: Type.String()
			})
		}
	};
	
	/** Body para verificar refresh token a partir de sí mismo */
	export const VerifyRefreshTokenBody = Type.Object({
		tokenHash: Type.String({
			description: 'Refresh Token hasheado que se hade verificar',
			minLength: 64,
			maxLength: 64
		})
	});
	
	/** Schema para verificar refresh token a partir de sí mismo */
	export const VerifyRefreshTokenSchema = {
		description: 'Validación del Refresh Token hasheado',
		tags: ['Auth'],
		body: VerifyRefreshTokenBody,
		response: {
			200: RefreshTokenResponseBody,
			400: Type.Object({
				error: Type.String(),
				message: Type.String()
			}),
			404: Type.Object({
				error: Type.String(),
				message: Type.String()
			}),
			500: Type.Object({
				error: Type.String(),
				message: Type.String()
			})
		}
	};
	
	export const DeleteRefreshTokenByUserParams = Type.Object({
		id: Type.String({
			description: 'Id del usuario dueño del Refresh Token a ser borrado',
			format: 'uuid'
		})
	});
	
	export const DeleteRefreshTokenByUserSchema = {
		description: 'Validación del parametro userId',
		tags: ['Auth'],
		params: DeleteRefreshTokenByUserParams,
		response: {
			204: Type.Void(),
			400: Type.Object({
				error: Type.String(),
				message: Type.String()
			}),
			500: Type.Object({
				error: Type.String(),
				message: Type.String()
			})
		}
	};
	
	export const DeleteExpiredTokensSchema = {
		description: 'Limpiea de base de datos',
		tags: ['Auth'],
		response: {
			204: Type.Void(),
			500: Type.Object({
				error: Type.String(),
				message: Type.String()
			})
		}
	}
}