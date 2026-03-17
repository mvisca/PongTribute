const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://localhost';

type RequestOptions = {
	method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	body?: unknown;
	token?: string;
};

export class ApiError extends Error {
	constructor(public readonly status: number, message: string) {
		super(message);
		this.name = 'ApiError';
	}
}

export async function apiRequest<T>(
	path: string,
	options: RequestOptions = {}
): Promise<T> {
	const { method = 'GET', body, token } = options;

	const headers: Record<string, string> = {}

	if (body) {
		headers['Content-Type'] = 'application/json';
	}

	if (token) {
		headers['Authorization'] = `Bearer ${token}`;
	}

	const response = await fetch(
		`${BASE_URL}${path}`, {
			method,
			headers,
			credentials: 'include',
			body: body ? JSON.stringify(body) : undefined,
		}
	);

	if (!response.ok) {
		// Fallback for infrastructure errors
		// Nginx sends them as HTML and they must be parsed as JSON
		// Other errors are sent by the backend as JSON, no need to parse them
		const errorMessages: Record<number, string> = {
        413: 'File too large. Please use an image under 10MB.',
        502: 'Server unavailable. Please try again later.',
        504: 'Request timed out. Please try again.',		
		}

		const error = await response.json().catch(() => ({
			message: errorMessages[response.status] ?? response.statusText }));
		
		throw new ApiError(response.status, error.message ?? 'Request failed');
	}

	// 204 no content
	if (response.status === 204) {
		return undefined as T;
	}

	return response.json() as Promise<T>;
}