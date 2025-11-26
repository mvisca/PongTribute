import dotenv from 'dotenv';
dotenv.config();

// ==================================================
// DEFAULTS
// ==================================================

const DEFAULTS = {
	// Auth Service
	AUTH_SERVICE_URL: 'http://localhost:3002',
	AUTH_SERVICE_PORT: 3002,
	AUTH_SERVICE_HOST: 'localhost',
	JWT_SECRET: 'default_super_secret_key_here',
	TOKEN_EXPIRY: '1h',
	REFRESH_TOKEN_EXPIRY: '365d',
	
	// User Servicenpx tsc --noEmit src/config/sharedEnv.ts
	USER_SERVICE_URL: 'http://localhost:3001',
	USER_SERVICE_PORT: 3001,
	USER_SERVICE_HOST: 'localhost',
	
	// Frontend
	FRONTEND_URL: 'http://localhost:5173',
	FRONTEND_PORT: 5173,
	FRONTEND_HOST: 'localhost',
	
	// Global
	NODE_ENV: 'development',
	DB_PATH: '../../db-data/',
	LOG_LEVEL: 'fatal',

	// Inter-Service Communication
	SERVICE_SECRET: 'default_shared_secret_between_services',
	
	// Testing
	TEST_MODE: "default_values",
} as const;

// =====================================================
// VALIDACIÓN (PRIVADO)
// =====================================================

// TODO implementar uso de validadores

function validatePort(port: number): void {
	if (!port || port < 1024 || port > 65535) {
		throw new Error(
			`Puerto inválido: ${port}. Debe estar entre 1024-65535`
		);
	}
}

function validateNodeEnv(env: string): void {
	const validEnvs = ['development', 'production', 'test'];
	if (!validEnvs.includes(env)) {
		throw new Error(
			`NODE_ENV inválido: ${env}. Debe ser: ${validEnvs.join(', ')}`
		);
	}
}

function validateSecrets(): void {
	const required = ['SERVICE_SECRET'];
	const missing = required.filter(key => !process.env[key]);

	if (missing.length > 0) {
		console.error(`❌ MISSING ENV VARS: ${missing.join(', ')}`);
		console.error('   Create .env from .env.example: cp .env.example .env');
		process.exit(1);
	}
}

// ==================================================
// BUILDER
// ==================================================

export namespace SharedEnv {
	
	export function build() {
		return {
			// ==================================================
			// AUTH SERVICEn = sh
			// ==================================================
			AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || DEFAULTS.AUTH_SERVICE_URL,
			AUTH_SERVICE_PORT: Number(process.env.AUTH_SERVICE_PORT) || DEFAULTS.AUTH_SERVICE_PORT,
			AUTH_SERVICE_HOST: process.env.AUTH_SERVICE_HOST || DEFAULTS.AUTH_SERVICE_HOST,
			JWT_SECRET: process.env.JWT_SECRET || DEFAULTS.JWT_SECRET,
			TOKEN_EXPIRY: process.env.TOKEN_EXPIRY || DEFAULTS.TOKEN_EXPIRY,
			REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY || DEFAULTS.REFRESH_TOKEN_EXPIRY,

			// ==================================================
			// USER SERVICE
			// ==================================================
			USER_SERVICE_URL: process.env.USER_SERVICE_URL || DEFAULTS.USER_SERVICE_URL,
			USER_SERVICE_PORT: Number(process.env.USER_SERVICE_PORT) || DEFAULTS.USER_SERVICE_PORT,
			USER_SERVICE_HOST: process.env.USER_SERVICE_HOST || DEFAULTS.USER_SERVICE_HOST,
			
			// ==================================================
			// FRONTEND
			// ==================================================
			FRONTEND_URL: process.env.FRONTEND_URL || DEFAULTS.FRONTEND_URL,
			FRONTEND_PORT: Number(process.env.FRONTEND_PORT) || DEFAULTS.FRONTEND_PORT,
			FRONTEND_HOST: process.env.FRONTEND_HOST || DEFAULTS.FRONTEND_HOST,
			
			// ==================================================
			// GLOBAL
			// ==================================================
			NODE_ENV: process.env.NODE_ENV || DEFAULTS.NODE_ENV,
			DB_PATH: process.env.DB_PATH || DEFAULTS.DB_PATH,
			LOG_LEVEL: process.env.LOG_LEVEL || DEFAULTS.LOG_LEVEL,

			// ==================================================
			// INTER-SERVICE COMMUNICATION
			// ==================================================
			SERVICE_SECRET: process.env.SERVICE_SECRET || DEFAULTS.SERVICE_SECRET,

			// ==================================================
			// TESTING
			// ==================================================
			TEST_MODE: process.env.TEST_MODE || DEFAULTS.TEST_MODE
			
		} as const;
	}
	
	// ==================================================
	// TYPES
	// ==================================================
	
	export type Config = ReturnType<typeof build>;
}