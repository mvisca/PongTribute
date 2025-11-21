import { Type } from '@sinclair/typebox';

export namespace AuthSchemas {
	
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
	* Body para /api/auth/login
	*/
	export const LoginBody = Type.Object({
		email: Type.String({ format: 'email' }),
		password: Type.String({ minLength: 8 })
	});

	/**
	 * Schema para /api/auth/login
	 */
	export const LoginSchema = {
		body: LoginBody,
		response: {
			200: Type.Object({
				token: Type.String(),
				user: Type.Object({
					id: Type.String(),
					username: Type.String(),
					email: Type.String()
				})
			}),
			401: Type.Object({
					error: Type.String(),
					message: Type.String()
			})
		}	
	};

	/**
	 * Body para PUT /api/auth/:id/password
	 */
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
	})

	/**
	* Schema para PUT /api/users/:id/password
	*/
	export const UpdatePasswordSchema = {
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
}