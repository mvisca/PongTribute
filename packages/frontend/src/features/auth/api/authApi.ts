import { apiRequest } from "../../../core/api/client";
import type { AuthTypes } from '@transcendence/shared/types/auth.types.js';

/** Llamado al endpoint login */
export async function login(
	email: string,
	password: string
): Promise<AuthTypes.LoginResponse> {
	return await apiRequest<AuthTypes.LoginResponse>('/auth/login', {
		method: 'POST',
		body: { email, password },
	});
}

/** Llamado al endpoint register */
export async function register(
	username: string,
	email: string,
	password: string,
	avatar?: string
): Promise<AuthTypes.LoginSuccessResponse> {
	return await apiRequest<AuthTypes.LoginSuccessResponse>('/auth/register', {
		method: 'POST',
		body: { username, email, password, avatar }
	});
}

/** Llamado a logout */
export async function logout(accessToken: string): Promise<void> {
	return await apiRequest<void>('/auth/logout', {
		method: 'POST',
		token: accessToken,
	});
}

/** Llamado a refreshAccessToken() */
export async function refreshAccessToken(): Promise<AuthTypes.LoginSuccessResponse> {
	return await apiRequest('/auth/refresh', {
		method: 'POST',
	});
}

/** Llamado a requestPasswordReset() */
export async function requestPasswordReset(email: string): Promise<void> {
	return await apiRequest<void>('/auth/password-reset/request', {
		method: 'POST',
		body: { email },
	});
}

/** Llamado a confirmPasswordReset */
export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
	return await apiRequest('/auth/password-reset/confirm', {
		method: 'POST',
		body: { token, newPassword },
	});
}

/** Verificar si el token de acceso sigue siendo válido */
export async function verifyToken(token: string): Promise<boolean> {
	try {
		await apiRequest('/auth/verify', { method: 'GET', token });
		return true;
	} catch {
		return false;
	}
}