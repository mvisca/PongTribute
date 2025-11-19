import { Type } from '@sinclair/typebox';

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
			}),
			401: Type.Object({
					error: Type.String(),
					message: Type.String()
			})
		}	
	};
}