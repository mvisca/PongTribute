import { apiRequestWithRefresh } from '../../../core/api/apiInterceptor';
import type { UserTypes } from '@transcendence/shared/types/user.types.js';

/**
 * Obtiene el perfil de un usuario.
 * @param userId - ID del usuario.
 * @param token - Token de autenticación.
 * @returns Promesa que resuelve con los datos del perfil del usuario.
 */
export async function getProfile(
	userId: string,
	token: string
): Promise<UserTypes.UserPublic> {
	return await apiRequestWithRefresh<UserTypes.UserPublic>(`/users/${userId}`, {
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
export async function updateProfile(
	userId: string,
	body: UserTypes.UpdateUserBody,
	token: string
): Promise<UserTypes.UserPublic> {
	return await apiRequestWithRefresh<UserTypes.UserPublic>(`/users/${userId}`, {
		method: 'PUT',
		body,
		token,
	});
}

export async function anonymizeAccount(userId: string, token: string): Promise<void> {
    await apiRequestWithRefresh<void>(`/users/${userId}/anonymize`, {
        method: 'PUT',
        token,
    });
}
