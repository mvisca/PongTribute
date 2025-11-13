import { Type, Static } from '@sinclair/typebox';

export namespace AuthSchemas {
	
	/**
	* Tipo para login
	* Front a back
	*/
	export const LoginBody = Type.Object({
		email: Type.String({ format: 'email' }),
		password: Type.String({ minLength: 8 })
	});

	// Schema completo para Fastify
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
			})
		}	
	};
}

export namespace AuthTypes {
	// Tipos TypeScript
	export type LoginData = Static<typeof AuthSchemas.LoginBody>;

	// Tipos de respuesta para login
	export type LoginResponse = Static<typeof AuthSchemas.LoginSchema.response[200]>;

	// Tipo para payload de generación de token
	export type UserPayload = LoginResponse['user'];
}