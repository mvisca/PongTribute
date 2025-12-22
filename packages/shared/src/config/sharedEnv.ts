import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// TODO arreglar manejo centralizado de variables de entorno
// TODO implementar correctamente en Auth service y en Game service la build() de env si aun no lo esta, y donde haya base de datos su construccion
// ==================================================
// CARGAR .ENV DESDE RAÍZ
// ==================================================

export function findEnvFile(startPath: string): string | null {
	// startPath should be provided by the caller (e.g. service's __dirname)
	// We still provide a fallback to the current module dirname if needed
	const __filename = fileURLToPath(import.meta.url);
	const moduleDirname = path.dirname(__filename);
	let currentPath = startPath || moduleDirname;
	while (currentPath !== path.parse(currentPath).root) {
		const envPath = path.join(currentPath, '.env');
		if (fs.existsSync(envPath)) {
			return envPath;
		}
		currentPath = path.dirname(currentPath);
	}
	return null;
}

// ==================================================
// DEFAULTS (Solo para development)
// ==================================================

interface EnvVars {
	AUTH_SERVICE_URL: string;
	AUTH_SERVICE_PORT: number;
	AUTH_SERVICE_HOST: string;
	JWT_SECRET: string;
	TOKEN_EXPIRY: number;
	REFRESH_TOKEN_EXPIRY: string;
	BCRYPT_ROUNDS: number;
	UNIQUE_SESSION: boolean;
	
	GAME_SERVICE_URL: string;
	GAME_SERVICE_PORT: number;
	GAME_SERVICE_HOST: string;
	GAME_SERVICE_DB_PATH: string;
	GAME_SERVICE_DB_FILENAME: string;
	GAME_SERVICE_DB_FULL_PATH: string;
	
	USER_SERVICE_URL: string;
	USER_SERVICE_PORT: number;
	USER_SERVICE_HOST: string;
	USER_SERVICE_DB_PATH: string;
	USER_SERVICE_DB_FILENAME: string;
	USER_SERVICE_DB_FULL_PATH: string;
	
	FRONTEND_URL: string;
	FRONTEND_PORT: number;
	FRONTEND_HOST: string;
	
	NODE_ENV: string;
	LOG_LEVEL: string;
	
	SERVICE_SECRET: string;
	REDIS_HOST: string;
	REDIS_PORT: number;
	REDIS_PASSWORD: string;
	REDIS_DB: number;
};

const DEFAULTS: EnvVars = {
	AUTH_SERVICE_URL: 'http://localhost:3002',
	AUTH_SERVICE_PORT: 3002,
	AUTH_SERVICE_HOST: 'localhost',
	JWT_SECRET: 'default_super_secret_key_CHANGE_THIS',
	TOKEN_EXPIRY: 3600,
	REFRESH_TOKEN_EXPIRY: '365d',
	BCRYPT_ROUNDS: 10,
	UNIQUE_SESSION: true,
	
	GAME_SERVICE_URL: 'http://localhost:3003',
	GAME_SERVICE_PORT: 3003,
	GAME_SERVICE_HOST: 'localhost',
	GAME_SERVICE_DB_FILENAME: 'game.db',
	GAME_SERVICE_DB_PATH: './db-data',
	GAME_SERVICE_DB_FULL_PATH: './db-data/game.db',
	
	USER_SERVICE_URL: 'http://localhost:3001',
	USER_SERVICE_PORT: 3001,
	USER_SERVICE_HOST: 'localhost',
	USER_SERVICE_DB_FILENAME: 'user.db',
	USER_SERVICE_DB_PATH: './db-data',
	USER_SERVICE_DB_FULL_PATH: './db-data/user.db',
	
	FRONTEND_URL: 'http://localhost:5173',
	FRONTEND_PORT: 5173,
	FRONTEND_HOST: 'localhost',
	
	NODE_ENV: 'test',
	LOG_LEVEL: 'info',
	
	SERVICE_SECRET: 'default_shared_secret_CHANGE_THIS',
	REDIS_HOST: 'localhost',
	REDIS_PORT: 6379,
	REDIS_PASSWORD: 'create_a_supersafe_redis_password',
	REDIS_DB: 0,	
} as const;

export type EnviromentVars = typeof DEFAULTS;

// ==================================================
// BUILDER
// ==================================================

export namespace SharedEnv {
	
	// TODO donde se llama build de sharedEnv pone try catch para hacer gracefullShutdown si hay error
	// Build configuration object from process.env (no side-effects)
	export function build() {
		const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
		const isTest = process.env.NODE_ENV === 'test';
		const isProduction = process.env.NODE_ENV === 'production';
		
		// Helper: usar default solo en development
		function envOr<T>(
			envValue: string | undefined,
			defaultValue: T,
			varName: string = "No hay varName"
		): T {
			if (envValue !== undefined) {
				// Parseo segun tipo de 'defaultValue'
				if (typeof defaultValue === 'number') {
					const n = Number(envValue);
					if (isNaN(n)) {
						console.error('\nERROR DE CONFIGURACIÓN\n');
						console.error(`Variable: ${varName || 'desconocida'}`);
						console.error(`Valor recibido: "${envValue}"`);
						console.error(`Tipo esperado: number`);
						console.error(`\nCTRL+C para terminar\n`);
						
						process.exit(1);
					}
					return n as T;
				}
				if (typeof defaultValue === 'boolean') {
					if (envValue === 'true') 
						return true as T;
					if (envValue === 'false')
						return false as T;
					
					console.error('\nERROR DE CONFIGURACIÓN\n');
					console.error(`Variable: ${varName || 'desconocida'}`);
					console.error(`Valor recibido: "${envValue}"`);
					console.error(`Tipo esperado: boolean`);
					console.error(`\nValores válidos: true, false\n`);
					console.error(`\nCTRL+C para terminar\n`);
					
					process.exit(1);
				}
				return envValue as T; // String
			}
			if (isDevelopment)
				return defaultValue;
			console.error(`${varName}: Variable de entorno requerida no encontrada`);
			process.exit(1);
		};
		
		function validatePort(port: number | undefined, context: string): void {
			if (!port || isNaN(port) || port < 1024 || port > 65535) {
				throw new Error(
					`Puerto inválido o faltante: ${context}=${port}. Debe estar entre 1024-65535`
				);
			}
		}
		
		function validateNodeEnv(env: string | undefined): void {
			const validEnvs = ['development', 'production', 'test'];
			if (!env || !validEnvs.includes(env)) {
				throw new Error(
					`NODE_ENV inválido o faltante: ${env}. Debe ser: ${validEnvs.join(', ')}`
				);
			}
		}
		
		function validateRequired<T>(value: T | undefined, name: string): void {
			if (value === undefined || value === null)
				throw new Error(`Variable requerida faltante: ${name}`);

			if (typeof value === 'string' && value.trim() === '')
				throw new Error(`Variable ${name} no puede estar vacía`);
		}

		function validateSecrets(secrets: Record<string, string | undefined>, isProduction: boolean): void {
			const missing: string[] = [];
			
			Object.entries(secrets).forEach(([key, value]) => {
				if (!value) {
					missing.push(`${key} no está definido`);
					return;
				}
				
				if (isProduction) {
					const defaultValue = DEFAULTS[key as keyof typeof DEFAULTS];
					if (value === defaultValue) {
						missing.push(`${key} usa valor default (INSEGURO en producción)`);
					}
				}
			});
			
			if (missing.length > 0) {
				console.error('ERRORES DE CONFIGURACIÓN:');
				missing.forEach(issue => console.error(`   - ${issue}`));
				console.error('\nSolución: cp .env.example .env');
				process.exit(1);
			}
		}
		
		function getBaseDir(): string {
			if (isDevelopment || isTest) {
				console.log('DEVELOPMENT envirnoment: cargando...');
				const __filename = fileURLToPath(import.meta.url);
				const __dirname = path.dirname(__filename);
				
				return path.resolve(__dirname, '../../../../db-data');
			}
			console.log('PRODUCTION environment: cargando...');
			return '/var/lib/app/db'; // path fijo para contenedor
		};
		
		function safeDbDir(envPath: string, baseDir: string) {
			const resolved = path.resolve(baseDir, envPath);
			const normalized = path.normalize(resolved);
			if (!normalized.startsWith(baseDir)) {
				throw new Error(`DB path fuera de BASE_DIR: ${envPath}`);
			}
			return normalized;
		}
		
		function safeDbFilename(name: string) {
			const base = path.basename(name);
			if (base !== name || base.startsWith('.') || base.includes('..')) {
				throw new Error(`DB filename inválido: ${name}`);
			}
			return base;
		}
		
		function safeFullPath(filename: string, dir: string, baseDir: string) {
			const safeDir = safeDbDir(dir, baseDir);
			const safeFile = safeDbFilename(filename);
			return path.join(safeDir, safeFile);
		}
		
		const config: EnvVars = {
			// AUTH SERVICE
			AUTH_SERVICE_URL: envOr(process.env.AUTH_SERVICE_URL, DEFAULTS.AUTH_SERVICE_URL, 'AUTH_SERVICE_URL'),
			AUTH_SERVICE_PORT: envOr(process.env.AUTH_SERVICE_PORT, DEFAULTS.AUTH_SERVICE_PORT, 'AUTH_SERVICE_PORT'),
			AUTH_SERVICE_HOST: envOr(process.env.AUTH_SERVICE_HOST, DEFAULTS.AUTH_SERVICE_HOST, 'AUTH_SERVICE_HOST'),
			JWT_SECRET: envOr(process.env.JWT_SECRET, DEFAULTS.JWT_SECRET, 'JWT_SECRET'),
			TOKEN_EXPIRY: envOr(process.env.TOKEN_EXPIRY, DEFAULTS.TOKEN_EXPIRY, 'TOKEN_EXPIRY'),
			REFRESH_TOKEN_EXPIRY: envOr(process.env.REFRESH_TOKEN_EXPIRY, DEFAULTS.REFRESH_TOKEN_EXPIRY, 'REFRESH_TOKEN_EXPIRY'),
			BCRYPT_ROUNDS: envOr(process.env.BCRYPT_ROUNDS, DEFAULTS.BCRYPT_ROUNDS, 'BCRYPT_ROUNDS'),
			UNIQUE_SESSION: envOr(process.env.UNIQUE_SESSION, DEFAULTS.UNIQUE_SESSION, 'UNIQUE_SESSION'),
			
			// GAME SERVICE
			GAME_SERVICE_URL: envOr(process.env.GAME_SERVICE_URL, DEFAULTS.GAME_SERVICE_URL, 'GAME_SERVICE_URL'),
			GAME_SERVICE_PORT: envOr(process.env.GAME_SERVICE_PORT, DEFAULTS.GAME_SERVICE_PORT, 'GAME_SERVICE_URL'),
			GAME_SERVICE_HOST: envOr(process.env.GAME_SERVICE_HOST, DEFAULTS.GAME_SERVICE_HOST, 'GAME_SERVICE_HOST'),
			GAME_SERVICE_DB_FILENAME: envOr(process.env.GAME_SERVICE_DB_FILENAME, DEFAULTS.GAME_SERVICE_DB_FILENAME, 'GAME_SERVICE_DB_FILENAME'),
			GAME_SERVICE_DB_PATH: envOr(process.env.GAME_SERVICE_DB_PATH, DEFAULTS.GAME_SERVICE_DB_PATH, 'GAME_SERVICE_DB_PATH'),
			GAME_SERVICE_DB_FULL_PATH: safeFullPath(
				envOr(process.env.GAME_SERVICE_DB_FILENAME, DEFAULTS.GAME_SERVICE_DB_FILENAME, 'GAME_SERVICE_DB_FILENAME'),
				envOr(process.env.GAME_SERVICE_DB_PATH, DEFAULTS.GAME_SERVICE_DB_PATH, 'GAME_SERVICE_DB_PATH'),
				getBaseDir()
			),
			
			// USER SERVICE
			USER_SERVICE_URL: envOr(process.env.USER_SERVICE_URL, DEFAULTS.USER_SERVICE_URL, 'USER_SERVICE_URL'),
			USER_SERVICE_PORT: envOr(process.env.USER_SERVICE_PORT, DEFAULTS.USER_SERVICE_PORT, 'USER_SERVICE_PORT'),
			USER_SERVICE_HOST: envOr(process.env.USER_SERVICE_HOST, DEFAULTS.USER_SERVICE_HOST, 'USER_SERVICE_HOST'),
			USER_SERVICE_DB_FILENAME: envOr(process.env.USER_SERVICE_DB_FILENAME, DEFAULTS.USER_SERVICE_DB_FILENAME, 'USER_SERVICE_DB_FILENAME'),
			USER_SERVICE_DB_PATH: envOr(process.env.USER_SERVICE_DB_PATH, DEFAULTS.USER_SERVICE_DB_PATH, 'USER_SERVICE_DB_FILENAME'),
			USER_SERVICE_DB_FULL_PATH: safeFullPath(
				envOr(process.env.USER_SERVICE_DB_FILENAME, DEFAULTS.USER_SERVICE_DB_FILENAME, 'USER_SERVICE_DB_FILENAME'),
				envOr(process.env.USER_SERVICE_DB_PATH, DEFAULTS.USER_SERVICE_DB_PATH, 'USER_SERVICE_DB_PATH'),
				getBaseDir()
			),
			
			// FRONTEND
			FRONTEND_URL: envOr(process.env.FRONTEND_URL, DEFAULTS.FRONTEND_URL, 'FRONTEND_URL'),
			FRONTEND_PORT: envOr(process.env.FRONTEND_PORT, DEFAULTS.FRONTEND_PORT, 'FRONTEND_PORT'),
			FRONTEND_HOST: envOr(process.env.FRONTEND_HOST, DEFAULTS.FRONTEND_HOST, 'FRONTEND_HOST'),
			
			// GLOBAL
			NODE_ENV: envOr(process.env.NODE_ENV, DEFAULTS.NODE_ENV, 'NODE_EV'),
			LOG_LEVEL: envOr(process.env.LOG_LEVEL, DEFAULTS.LOG_LEVEL, 'LOG_LEVEL'),
			
			// INTER-SERVICE COMMUNICATION
			SERVICE_SECRET: envOr(process.env.SERVICE_SECRET, DEFAULTS.SERVICE_SECRET, 'SERVICE_SECRET'),
			
			// REDIS 
			REDIS_HOST: envOr(process.env.REDIS_HOST, DEFAULTS.REDIS_HOST, 'REDIS_HOST'),
			REDIS_PORT: envOr(process.env.REDIS_PORT, DEFAULTS.REDIS_PORT, 'REDIS_PORT'),
			REDIS_PASSWORD: envOr(process.env.REDIS_PASSWORD, DEFAULTS.REDIS_PASSWORD, 'REDIS_PASSWORD'),
			REDIS_DB: envOr(process.env.REDIS_DB, DEFAULTS.REDIS_DB, 'REDIS_DB'),
		};
		
		// ==================================================
		// VALIDACIONES
		// ==================================================
		
		// NODE_ENV (siempre requerido)
		validateNodeEnv(config.NODE_ENV);
		
		// Puertos (siempre requeridos)
		validatePort(config.AUTH_SERVICE_PORT, 'AUTH_SERVICE_PORT');
		validatePort(config.USER_SERVICE_PORT, 'USER_SERVICE_PORT');
		validatePort(config.FRONTEND_PORT, 'FRONTEND_PORT');
		validatePort(config.REDIS_PORT, 'REDIS_PORT');
		
		// Secrets (requeridos + no defaults en producción)
		validateSecrets({
			JWT_SECRET: config.JWT_SECRET,
			SERVICE_SECRET: config.SERVICE_SECRET,
			REDIS_PASSWORD: config.REDIS_PASSWORD
		}, isProduction);
		
		// Siempre requeridos
		validateRequired(config.USER_SERVICE_DB_FILENAME, 'USER_SERVICE_DB_FILENAME');
		
		validateRequired(config.AUTH_SERVICE_URL, 'AUTH_SERVICE_URL');
		validateRequired(config.FRONTEND_URL, 'FRONTEND_URL');
		validateRequired(config.USER_SERVICE_URL, 'USER_SERVICE_URL');
		
		validateRequired(config.REDIS_HOST, 'REDIS_HOST');
		validateRequired(config.REDIS_DB, 'REDIS_DB');
		
		return config;
	}
	
	export type Config = ReturnType<typeof build>;
}