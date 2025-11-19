import { FastifyInstance } from 'fastify';
import { TestConstants } from './testConstants';
import { AuthTypes, UserTypes } from '../types';
import bcrypt from 'bcryptjs';

export namespace TestUtils {

	// ============================================================================
	// INTERFAZ DE ARGUMENTOS
	// ============================================================================

	// Para configurar servicios y app opcional
	export interface SetupUserOptions {
		app?: FastifyInstance;
		baseUrl?: string;
		authServiceUrl?: string;
		userServiceUrl: string;
		gameServiceUrl: string;
	}

	// Para método request (interno)
	interface RequestOptions<TBody = any> {
		method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
		url: string;
		serviceUrl?: string;
		payload?: TBody;
		headers?: Record<string, string>;
		app?: FastifyInstance; 
	}

	// ============================================================================
	// LOGIN PROCESS
	// ============================================================================

	async function doLogin(
		email: string,
		password: string,
		options = {
			userServiceUrl: 'http://localhost:3001',
			authServiceUrl: 'http://localhost:3002'
		}
	): Promise<AuthTypes.LoginResponse> {
		// llamado a api/login
		const sessionData = await fetch(
			`${options.authServiceUrl}/api/login`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email, password })
			}
		);

		// verifica login
		if (!sessionData.ok) {
			throw new Error(`Fallo autenticando user en doLogin: ${email}`);
		}

		// devuelve login response con user y token
		return (await sessionData.json()) as AuthTypes.LoginResponse;
	}

	// si no existe, crea un user y lo logea
	export async function setupUser(
		key: TestConstants.TestUserKey,
		options = {
			userServiceUrl: 'http://localhost:3001',
			authServiceUrl: 'http://localhost:3002'
		}
	): Promise<AuthTypes.LoginResponse> {
		// obtiene los datos para crear el user desde constantes
		const userData = TestConstants.TEST_USERS[key];

		// verifica que existe el user
		const userExists = await fetch(
			`${options.userServiceUrl}/api/users/check-email/${userData.email}`
		);

		// si no existe, lo crea
		if (!userExists.ok) {
			const { password, ...rest } = userData;
			const passwordHash = bcrypt.hashSync(userData.password);
			const createUserData: UserTypes.CreateUserBody = {
				...rest,
				passwordHash
			};

			const response = await fetch(`${options.userServiceUrl}/api/users`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					username: createUserData.username,
					email: createUserData.email,
					avatar: createUserData.avatar,
					passwordHash: createUserData.passwordHash
				})
			});

			if (!response.ok) {
				throw new Error(`Fallo creando user: ${userData}`);
			}

			const sessionData = await doLogin(userData.email, userData.password, options);
			return sessionData;
		}

		// Si existe, solo login
		const userSession = await doLogin(userData.email, userData.password, options);
		return userSession;
	}

	// ============================================================================
	// HTTP HELPERS
	// ============================================================================
	
	export async function fetchWithAuth(
		url: string,
		token: string,
		options: RequestInit = {}
	): Promise<Response> {
		return fetch(url, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`,
				...options.headers
			}
		});
	}
	
	// ============================================================================
	// TEST SETUP
	// ============================================================================
	
	export async function logAllUsers(
		options = {
			userServiceUrl: 'http://localhost:3001',
			authServiceUrl: 'http://localhost:3002'
		}
	): Promise<Map<TestConstants.TestUserKey, AuthTypes.LoginResponse>> {
		const sessions = new Map<TestConstants.TestUserKey, AuthTypes.LoginResponse>();
		
		for (const key of TestConstants.TEST_USERS_KEYS) {
			console.log(`=== Configurando Test User: ${key} ===`);
			const userLoged = await setupUser(key, options);
			
			if (!userLoged) {
				throw new Error(`Fallo al inicializar usuario de test ${key}`);
			}
			
			sessions.set(key, userLoged);
		}
		
		console.log('✅ Sessions creadas');
		return sessions;
	}	
}