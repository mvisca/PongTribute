import { apiRequest } from "../../../core/api/client";
import type { AuthTypes } from '@transcendence/shared';

/** Llamado al endpoint login */
export async function login(
	email: string,
	password: string
): Promise<AuthTypes.LoginResponse> {
	return apiRequest<AuthTypes.LoginResponse>('/auth/login', {
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
	return apiRequest<AuthTypes.LoginSuccessResponse>('/auth/register', {
		method: 'POST',
		body: { username, email, password, avatar }
	});
}

/** Llamado a logout */
export async function logout(accessToken: string): Promise<void> {
	return apiRequest<void>('/auth/logout', {
		method: 'POST',
		token: accessToken,
	});
}

/** Llamado a refreshAccessToken() */
export async function refreshAccessToken(): Promise<AuthTypes.LoginSuccessResponse> {
	return apiRequest('/auth/refresh', {
		method: 'POST',
	});
}

/** Llamado a requestPasswordReset() */
export async function requestPasswordReset(email: string): Promise<void> {
	return apiRequest<void>('/auth/password-reset/request', {
		method: 'POST',
		body: { email },
	});
}

/** Llamado a confirmPasswordReset */
export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
	return apiRequest('/auth/password-reset/confirm', {
		method: 'POST',
		body: { token, newPassword },
	});
}