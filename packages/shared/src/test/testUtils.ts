import { FastifyInstance } from 'fastify';
import { TestConstants, AuthTypes, UserTypes, SharedEnv, AuthConstants } from '../index.js';

export namespace TestUtils {

	// ============================================================================
	// INTERFAZ DE ARGUMENTOS
	// ============================================================================

	// Respuesta con status code para tests
	export interface TestResponse<T = any> {
		data: T | null;
		status: number;
	}

	// Para método request (interno)
	interface RequestOptions<TPayload = any> {
		method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
		path: string;
		serviceUrl?: string;
		payload?: TPayload;
		headers?: Record<string, string>;
		app?: FastifyInstance;
	}

	// Para configurar servicios y app opcional
	interface SetupUserOptions {
		userServiceUrl?: string;
		authServiceUrl?: string;
		app?: FastifyInstance;
	}

	// Para fetchWithAuth
	interface FetchWithAuthOptions<TPayload = any> {
		method?: RequestOptions['method'];
		payload?: TPayload;
		headers?: Record<string, string>;
		app?: FastifyInstance;
	}

	// ============================================================================
	// PRIVATE METHODS
	// ============================================================================

	// En algnos casos los test se realizan con fetch, llamando a los endpoits via HTTP
	// En otros casos se llama a los endpoints mediant inject de fastify para pruebas
	// Este metodo abstrae este contexto y permite crear los usuarios de prueba en ambos contextos
	// Para crearlos se deben hacer requests al repositorio users y se haran de forma abstracta
	async function request<T = any, TPayload = any>(
		options: RequestOptions<TPayload>
	): Promise<T> {
		const {
			method,
			path,
			serviceUrl,
			payload,
			headers = {},
			app
		} = options;

		// Metodo para contextos con inject
		// Se proporciona el app devuelto por buildApp para llamar inject
		if (app) {
			const response = await app.inject({
				method,
				url: path,
				...(payload && { payload: JSON.stringify(payload) }),
				headers: {
					'Content-Type': 'application/json',
					...headers
				}
			});

			if (response.statusCode >= 400) {
				throw new Error(
					`Request failed: ${method} ${path} - Status: ${response.statusCode}`
				);
			}

			return response.json() as T;
		}

		// Metodo para contextos con fetch
		// Primero se valida que haya serviceUrl donde dirigir la request
		if (!serviceUrl) {
			throw new Error(`serviceUrl es necesaria cuando app no se proporciona`)
		}

		const fullUrl = `${serviceUrl}${path}`;
		const response = await fetch(fullUrl, {
			method,
			headers: {
				'Content-Type': 'application/json',
				...headers
			},
			...(payload && { body: JSON.stringify(payload) })
		});

		if (!response.ok) {
			throw new Error(
				`Requestfailed: ${method} ${fullUrl} - Status: ${response.status}`
			)
		}

		return await response.json() as T;
	}

	async function doLogin(
		email: string,
		password: string,
		options: SetupUserOptions = {}
	): Promise<AuthTypes.LoginResponse> {

		const authServiceUrl = options.authServiceUrl || 'http://localhost:3002';

		// llamado a api/login
		return await request<AuthTypes.LoginResponse>(
		{
			method: 'POST',
			path: '/api/auth/login',
			serviceUrl: authServiceUrl,
			payload: { email, password },
			...( options.app && { app: options.app } )
		});
	}

	// ============================================================================
	// PUBLIC METHODS
	// ============================================================================

	// si no existe, crea un user y lo logea
	export async function setupUser(
		key: TestConstants.TestUserKey,
		options: SetupUserOptions = {}
	): Promise<AuthTypes.LoginResponse> {

		const userServiceUrl = options.userServiceUrl || 'http://localhost:3001';

		// obtiene los datos para crear el user desde constantes
		const userData = TestConstants.TEST_USERS[key];

		// verifica que existe el user
		const checkUser = await request<UserTypes.AvailabilityResponse>({
			method: 'GET',
			path: `/api/users/check-email/${userData.email}`,
			serviceUrl: userServiceUrl,
			app: options.app
		});

		// si no existe, lo crea
		if (checkUser.available) {
			// CORRECCIÓN: Cargar variables para obtener el secreto
        	const env = SharedEnv.build();

			const response = await request<UserTypes.UserPublic>({
				method: 'POST',
				path: '/internal/users', // <--- CAMBIO: Ruta interna
				serviceUrl: userServiceUrl,
				payload: userData,
				headers: {
                'X-Service-Secret': env.SERVICE_SECRET // <--- CAMBIO: Auth header
            	},
				app: options.app
			});
		}
	
		// Si existe, solo login
		const userSession = await doLogin(userData.email, userData.password, options);
		return userSession;
	}

	// ============================================================================
	// HTTP HELPERS
	// ============================================================================

	export async function fetchWithAuth<T = any, TPayload = any>(
		url: string,
		token: string,
		options: FetchWithAuthOptions<TPayload> = {}
	): Promise<TestResponse<T>> {

		let serviceUrl: string | undefined;
		let path: string;

		if (url.startsWith('http://') || url.startsWith('https://')) {
			const urlObj = new URL(url);
			serviceUrl = `${urlObj.protocol}//${urlObj.host}`;
			path = urlObj.pathname + urlObj.search;
		}
		else {
			path = url;
			serviceUrl = undefined;
		}

		// Para inject de Fastify
		if (options.app) {
			const injectHeaders: Record<string, string> = {
				'Authorization': `Bearer ${token}`,
				...options.headers
			};
			if (options.payload) {
				injectHeaders['Content-Type'] = 'application/json';
			}
			const response = await options.app.inject({
				method: options.method || 'GET',
				url: path,
				...(options.payload && { payload: JSON.stringify(options.payload) }),
				headers: injectHeaders
			});

			let data: T | null = null;
			try {
				data = response.json() as T;
			} catch {
				// 204 No Content u otras respuestas sin body
			}

			return { data, status: response.statusCode };
		}

		// Para fetch HTTP
		if (!serviceUrl) {
			throw new Error(`serviceUrl es necesaria cuando app no se proporciona`);
		}

		const fullUrl = `${serviceUrl}${path}`;
		const headers: Record<string, string> = {
			'Authorization': `Bearer ${token}`,
			...options.headers
		};
		// Solo añadir Content-Type si hay payload
		if (options.payload) {
			headers['Content-Type'] = 'application/json';
		}
		const response = await fetch(fullUrl, {
			method: options.method || 'GET',
			headers,
			...(options.payload && { body: JSON.stringify(options.payload) })
		});

		let data: T | null = null;
		try {
			const text = await response.text();
			if (text) {
				data = JSON.parse(text) as T;
			}
		} catch {
			// 204 No Content u otras respuestas sin body
		}

		return { data, status: response.status };
	}
	
	// ============================================================================
	// TEST SETUP
	// ============================================================================
	
	export async function logAllUsers(
		options: SetupUserOptions = {}
	): Promise<Map<TestConstants.TestUserKey, AuthTypes.LoginResponse>> {
		
		const sessions = new Map<TestConstants.TestUserKey, AuthTypes.LoginResponse>();
		
		for (const key of TestConstants.TEST_USERS_KEYS) {
			console.log(`=== Configurando Test User: ${key} ===`);
			const userLoged = await setupUser(key, options);
			
			if (!userLoged || !('token' in userLoged)) {
				throw new Error(`Fallo al inicializar usuario de test ${key}`);
			}
			
			sessions.set(key, userLoged);
		}
		
		console.log('✅ Sessions creadas');
		return sessions;
	}	
}