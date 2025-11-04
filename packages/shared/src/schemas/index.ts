import { Static } from '@sinclair/typebox';
import * as UserSchemas from './user.schema';
  
export namespace Schemas { 
	// User Schemas
	export const createUserSchema = UserSchemas.createUserSchema;
	export const updateUserSchema = UserSchemas.updateUserSchema;
	export const updatePasswordSchema = UserSchemas.updatePasswordSchema;
	export const deleteUserSchema = UserSchemas.deleteUserSchema;
	export const getUserByIdSchema = UserSchemas.getUserByIdSchema;
	export const getUserByUsernameSchema = UserSchemas.getUserByUsernameSchema;
	export const getUserByEmailSchema = UserSchemas.getUserByEmailSchema;
	export const checkUsernameSchema = UserSchemas.checkUsernameSchema;
	export const checkEmailSchema = UserSchemas.checkEmailSchema;

	// Friendship Schemas 
	
	// Match Schemas
}

export namespace Types {
	// User Types
	export type CreateUserBody = Static<typeof UserSchemas.CreateUserBody>;
	export type UpdateUserBody = Static<typeof UserSchemas.UpdateUserBody>;
	export type UpdatePasswordBody = Static<typeof UserSchemas.UpdatePasswordBody>;
	export type UserIdParams = Static<typeof UserSchemas.UserIdParams>;
	export type UsernameParams = Static<typeof UserSchemas.UsernameParams>;
	export type EmailParams = Static<typeof UserSchemas.EmailParams>;
	export type UserPublic = Static<typeof UserSchemas.UserPublic>;
	export type UserInternal = Static<typeof UserSchemas.UserInternal>;
	
	// Friendship Types
	
	// Match Types
}
