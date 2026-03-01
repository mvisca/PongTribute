import { apiRequest } from '../../../core/api/client';
import type { UserTypes } from '@transcendence/shared/types/user.types.js';

/**
 * Obtiene el perfil de un usuario.
 * @param userId - ID del usuario.
 * @param token - Token de autenticación.
 * @returns Promesa que resuelve con los datos del perfil del usuario.
 */
export function getProfile(
	userId: string,
	token: string
): Promise<UserTypes.UserPublic> {
	return apiRequest<UserTypes.UserPublic>(`/api/users/${userId}`, {
		method: 'GET',
		token
	});
}

/**
 * Actualiza el perfil de un usuario.
 * @param userId - ID del usuario.
 * @param body - Datos del perfil a actualizar.
 * @param token - Token de autenticación.
 * @returns Promesa que resuelve con los datos actualizados del perfil del usuario.
 */
export function updateProfile(
	userId: string,
	body: UserTypes.UpdateUserBody,
	token: string
): Promise<UserTypes.UserPublic> {
	return apiRequest<UserTypes.UserPublic>(`/api/users/${userId}`, {
		method: 'PUT',
		body,
		token,
	});
}
