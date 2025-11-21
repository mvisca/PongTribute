import { Static } from '@sinclair/typebox';
import { AuthSchemas } from "../schemas";

export namespace AuthTypes {
	// Tipos TypeScript
	export type LoginData = Static<typeof AuthSchemas.LoginBody>;

	// Tipos de respuesta para login
	export type LoginResponse = Static<typeof AuthSchemas.LoginSchema.response[200]>;

	// Tipo para payload de generación de token
	export type UserPayload = LoginResponse['user'];

	export type UpdatePasswordBody = Static<typeof AuthSchemas.UpdatePasswordBody>;
}