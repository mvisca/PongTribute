const BASE_URL = import.meta.env.VITE_GATEWAY_URL ?? 'http://localhost/api';

type RequestOptions = {
	method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	body?: unknown;
	token?: string;
};

export async function apiRequest<T>(
	path: string,
	options: RequestOptions = {}
): Promise<T> {
	const { method = 'GET', body, token } = options;

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
	};

	if (token) {
		headers['Authorization'] = `Bearer ${token}`;
	}

	const response = await fetch(
		`${BASE_URL}${path}`, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined,
		}
	);

	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: response.statusText }));
		throw new Error(error.message ?? 'Request failed');
	}

	// 204 no content
	if (response.status === 204) {
		return undefined as T;
	}

	return response.json() as Promise<T>;
}