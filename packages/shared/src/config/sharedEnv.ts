import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
// TODO arreglar manejo centralizado de variables de entorno
// ==================================================
// CARGAR .ENV DESDE RAÍZ
// ==================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findEnvFile(startPath: string): string | null {
	let currentPath = startPath;
	
	while (currentPath !== path.parse(currentPath).root) {
		const envPath = path.join(currentPath, '.env');
		if (fs.existsSync(envPath)) {
			return envPath;
		}
		currentPath = path.dirname(currentPath);
	}
	
	return null;
}

const envPath = findEnvFile(__dirname);
if (envPath) {
	dotenv.config({ path: envPath });
} else {
	dotenv.config();
}

// ==================================================
// DEFAULTS (Solo para development)
// ==================================================

const DEFAULTS = {
	AUTH_SERVICE_URL: 'http://localhost:3002',
	AUTH_SERVICE_PORT: 3002,
	AUTH_SERVICE_HOST: 'localhost',
	JWT_SECRET: 'default_super_secret_key_CHANGE_THIS',
	TOKEN_EXPIRY: '1h',
	REFRESH_TOKEN_EXPIRY: '365d',
	BCRYPT_ROUNDS: 10,
	UNIQUE_SESSION: 1,
	
	USER_SERVICE_URL: 'http://localhost:3001',
	USER_SERVICE_PORT: 3001,
	USER_SERVICE_HOST: 'localhost',
	
	FRONTEND_URL: 'http://localhost:5173',
	FRONTEND_PORT: 5173,
	FRONTEND_HOST: 'localhost',
	
	NODE_ENV: 'test',
	DB_PATH: '../../db-data/',
	LOG_LEVEL: 'info',
	
	SERVICE_SECRET: 'default_shared_secret_CHANGE_THIS',
	REDIS_HOST: 'localhost',
	REDIS_PORT: 6743,
	REDIS_PASSWORD: 'create_a_supersafe_redis_password',
	REDIS_BD: 0,

	TEST_MODE: 'default_values',
} as const;

// ==================================================
// VALIDACIÓN
// ==================================================

function validatePort(port: number | undefined, context: string): void {
	if (!port || isNaN(port) || port < 1024 || port > 65535) {
		throw new Error(
			`❌ Puerto inválido o faltante: ${context}=${port}. Debe estar entre 1024-65535`
		);
	}
}

function validateNodeEnv(env: string | undefined): void {
	const validEnvs = ['development', 'production', 'test'];
	if (!env || !validEnvs.includes(env)) {
		throw new Error(
			`❌ NODE_ENV inválido o faltante: ${env}. Debe ser: ${validEnvs.join(', ')}`
		);
	}
}

function validateRequired(value: string | undefined, name: string): void {
	if (!value) {
		throw new Error(`❌ Variable requerida faltante: ${name}`);
	}
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
		console.error('❌ ERRORES DE CONFIGURACIÓN:');
		missing.forEach(issue => console.error(`   - ${issue}`));
		console.error('\n💡 Solución: cp .env.example .env');
		process.exit(1);
	}
}

// ==================================================
// BUILDER
// ==================================================

export namespace SharedEnv {
	
	export function build() {
		const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
		const isProduction = process.env.NODE_ENV === 'production';
		
		// Helper: usar default solo en development
		function envOr<T>(envValue: string | undefined, defaultValue: T): T {
			if (envValue !== undefined) {
				// Parseo segun tipo de 'defaultValue'
				if (typeof defaultValue === 'number')
					return Number(envValue) as T;
				if (typeof defaultValue === 'boolean')
					return (envValue === 'true') as T;
				return envValue as T; // String
			}
			if (isDevelopment)
				return defaultValue;
			throw new Error('Variable de entorno requerida para produccion no encontrada');
		};
		
		const config = {
			// AUTH SERVICE
			AUTH_SERVICE_URL: envOr(process.env.AUTH_SERVICE_URL, DEFAULTS.AUTH_SERVICE_URL),
			AUTH_SERVICE_PORT: envOr(process.env.AUTH_SERVICE_PORT, DEFAULTS.AUTH_SERVICE_PORT),
			AUTH_SERVICE_HOST: envOr(process.env.AUTH_SERVICE_HOST, DEFAULTS.AUTH_SERVICE_HOST),
			JWT_SECRET: envOr(process.env.JWT_SECRET, DEFAULTS.JWT_SECRET),
			TOKEN_EXPIRY: envOr(process.env.TOKEN_EXPIRY, DEFAULTS.TOKEN_EXPIRY),
			REFRESH_TOKEN_EXPIRY: envOr(process.env.REFRESH_TOKEN_EXPIRY, DEFAULTS.REFRESH_TOKEN_EXPIRY),
			BCRYPT_ROUNDS: envOr(process.env.BCRYPT_ROUNDS, DEFAULTS.BCRYPT_ROUNDS),
			UNIQUE_SESSION: envOr(process.env.UNIQUE_SESSION, DEFAULTS.UNIQUE_SESSION),
			
			// USER SERVICE
			USER_SERVICE_URL: envOr(process.env.USER_SERVICE_URL, DEFAULTS.USER_SERVICE_URL),
			USER_SERVICE_PORT: envOr(process.env.USER_SERVICE_PORT, DEFAULTS.USER_SERVICE_PORT),
			USER_SERVICE_HOST: envOr(process.env.USER_SERVICE_HOST, DEFAULTS.USER_SERVICE_HOST),
			
			// FRONTEND
			FRONTEND_URL: envOr(process.env.FRONTEND_URL, DEFAULTS.FRONTEND_URL),
			FRONTEND_PORT: envOr(process.env.FRONTEND_PORT, DEFAULTS.FRONTEND_PORT),
			FRONTEND_HOST: envOr(process.env.FRONTEND_HOST, DEFAULTS.FRONTEND_HOST),
			
			// GLOBAL
			NODE_ENV: envOr(process.env.NODE_ENV, DEFAULTS.NODE_ENV),
			DB_PATH: envOr(process.env.DB_PATH, DEFAULTS.DB_PATH),
			LOG_LEVEL: envOr(process.env.LOG_LEVEL, DEFAULTS.LOG_LEVEL),
			
			// INTER-SERVICE COMMUNICATION
			SERVICE_SECRET: envOr(process.env.SERVICE_SECRET, DEFAULTS.SERVICE_SECRET),
			REDIS_HOST: envOr(process.env.REDIST_HOST, DEFAULTS.REDIS_HOST),
			REDIS_PORT: envOr(process.env.REDIS_PORT, DEFAULTS.REDIS_PORT),
			REDIS_PASSWORD: envOr(process.env.REDIS_PASSWORD, DEFAULTS.REDIS_PASSWORD),
			REDIS_DB: envOr(process.env.REDIS_DB, DEFAULTS.REDIS_BD),

			// TESTING
			TEST_MODE: envOr(process.env.TEST_MODE, DEFAULTS.TEST_MODE),
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
		
		// DB_PATH (siempre requerido)
		validateRequired(config.DB_PATH, 'DB_PATH');
		validateRequired(config.REDIS_HOST, 'REDIS_HOST');
		validateRequired(config.REDIS_HOST, 'REDIS_DB');

		// URLs de servicios (requeridas)
		validateRequired(config.AUTH_SERVICE_URL, 'AUTH_SERVICE_URL');
		validateRequired(config.USER_SERVICE_URL, 'USER_SERVICE_URL');
		validateRequired(config.FRONTEND_URL, 'FRONTEND_URL');
		
		return config;
	}
	
	export type Config = ReturnType<typeof build>;
}

/*
// packages/shared/src/config/schema.ts
import { Type, Static } from '@sinclair/typebox';

export const ConfigSchema = Type.Object({
  // Global
  NODE_ENV: Type.Enum({ development: 'development', production: 'production', test: 'test' }),
  LOG_LEVEL: Type.String({ default: 'info' }),
  
  // Auth
  AUTH_SERVICE_PORT: Type.Number({ minimum: 1024, maximum: 65535, default: 3002 }),
  AUTH_SERVICE_HOST: Type.String({ default: 'localhost' }),
  JWT_SECRET: Type.String({ minLength: 10 }),
  TOKEN_EXPIRY: Type.String({ default: '15m' }),
  REFRESH_TOKEN_EXPIRY: Type.String({ default: '30d' }),
  
  // User
  USER_SERVICE_PORT: Type.Number({ minimum: 1024, maximum: 65535, default: 3001 }),
  USER_SERVICE_HOST: Type.String({ default: 'localhost' }),
  DB_PATH: Type.String({ default: './db-data' }),
  
  // Redis
  REDIS_HOST: Type.String({ default: 'localhost' }),
  REDIS_PORT: Type.Number({ minimum: 1, maximum: 65535, default: 6379 }),
  REDIS_PASSWORD: Type.Optional(Type.String()),
  
  // Email
  SMTP_HOST: Type.Optional(Type.String()),
  SMTP_PORT: Type.Optional(Type.Number({ minimum: 1, maximum: 65535 })),
  SMTP_USER: Type.Optional(Type.String()),
  SMTP_PASSWORD: Type.Optional(Type.String()),
  FROM_EMAIL: Type.Optional(Type.String({ format: 'email' })),
  
  // Inter-service
  SERVICE_SECRET: Type.String({ minLength: 10 }),
});

// Exportar tipo inferido
export type Config = Static<typeof ConfigSchema>;

// Función de parseo
import Ajv from 'ajv';

const ajv = new Ajv();
const validate = ajv.compile(ConfigSchema);

export function parseConfig(): Config {
  // Preparar env (castear a número, etc)
  const rawEnv = {
    NODE_ENV: process.env.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL,
    AUTH_SERVICE_PORT: process.env.AUTH_SERVICE_PORT ? parseInt(process.env.AUTH_SERVICE_PORT) : 3002,
    JWT_SECRET: process.env.JWT_SECRET,
    // ... resto de variables
  };
  
  // Validar contra schema
  const valid = validate(rawEnv);
  if (!valid) {
    const errors = validate.errors?.map(e => `${e.instancePath} ${e.message}`).join(', ');
    throw new Error(`Config validation error: ${errors}`);
  }
  
  return rawEnv as Config;
}
  TODO estrategia para manejar .en validado y centralizado
  */