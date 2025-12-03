import { Static } from '@sinclair/typebox';
import { UserSchemas } from '../index.js';

export namespace UserTypes {
	/**
	 * Tipo interno para User Mapper\
	 * Define los campos 
	*/
	export type UserRow = {
		id: string;
		username: string;
		email: string;
		avatar: string;
		password_hash: string;
		is_online: number;
		is_deleted: number;
		has_2fa_enabled: number;
		totp_secret: string;
		backup_code_hash: string;
		created_at: number;
		updated_at: number;
	}
	
	export type CreateUserInput = Static<typeof UserSchemas.CreateUserInput>;
	export type CreateUserBody = Static<typeof UserSchemas.CreateUserBody>;
	export type UpdateUserBody = Static<typeof UserSchemas.UpdateUserBody>;
	export type UpdatePasswordInternalBody = Static<typeof UserSchemas.UpdatePasswordInternalBody>;
	export type UserIdParams = Static<typeof UserSchemas.UserIdParams>;
	export type UsernameParams = Static<typeof UserSchemas.UsernameParams>;
	export type EmailParams = Static<typeof UserSchemas.EmailParams>;
	export type UserPublic = Static<typeof UserSchemas.UserPublic>;
	export type UserInternal = Static<typeof UserSchemas.UserInternal>;
	export type AvailabilityResponse = Static<typeof UserSchemas.AvailabilityResponse>;
}