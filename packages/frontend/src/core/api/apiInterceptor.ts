import { apiRequest, ApiError } from "./client";
import { refreshAccessToken} from "../../features/auth/api/authApi";
import { useAuthStore } from "../auth/AuthStore";

type RequestOptions = {
	method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	body?: unknown;
	token?: string;
};

// Singleton promise to avoid multiple concurrent refreshes
let refreshPromise: Promise<string> | null = null;

export async function doRefresh(): Promise<string> {
	if (!refreshPromise) {
		console.log('[ApiInterceptor] Rotating token with refresh token');
		refreshPromise = refreshAccessToken()
			.then((data) => {
				useAuthStore.getState().setAccessToken(data.token);
				useAuthStore.getState().setUser(data.user);
				return data.token;
			})
			.finally(() => {
				refreshPromise = null;
			})
	}
	return refreshPromise;
}

/** Template, flexible to multiple types of response */
export async function apiRequestWithRefresh<T>(
	path: string,
	options: RequestOptions = {}
): Promise<T> {
	try {
		// Tryes the plain request
		return await apiRequest<T>(path, options);
	} catch (err) {
		// Intercepts the 401 errors from ApiRequest  
		if (err instanceof ApiError && err.status === 401) {
			try {
				const newToken = await doRefresh();

				console.log('Retrying apiRequest with new token');
				return await apiRequest<T>(path, { ...options, token: newToken });
			} catch(refreshErr) {
				if (refreshErr instanceof ApiError && refreshErr.status < 500) {
					// Only executes if error code under 500, likely 401 or 403
					useAuthStore.getState().logout();
					console.log('Failed to refresh tokens, refrersh token expired or invalid');
				} else {
					console.warn('[ApiInterceptor] Refresh failed due to infrastructure error, no loggin out');
				}
				throw err; // Propagates the error
			}
		}
		throw err; // Other errors than 401 are propagated directly
	}
}