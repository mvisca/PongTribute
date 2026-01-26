import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findEnvFile } from '@transcendence/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = findEnvFile(__dirname);
if (envPath) {
	dotenv.config({ path: envPath });
} else {
	dotenv.config();
}

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULTS = {
	COMMS_PORT: 3005,
	COMMS_HOST: '0.0.0.0',
	
	REDIS_HOST: 'localhost',
	REDIS_PORT: 6379,
	
	USER_SERVICE_URL: 'http://localhost:3001',
	
	NODE_ENV: 'development',
	LOG_LEVEL: 'info',
	
	WS_PING_INTERVAL_MS: 30_000,
	WS_PONG_TIMEOUT_MS: 10_000,
	WS_MAX_CONNECTIONS: 1000,
	WS_MAX_CONNECTIONS_PER_USER: 3
} as const;

// ============================================================================
// HELPERS
// ============================================================================

function numberFromEnv(name: string, fallback: number): number {
	const raw = process.env[name];
	if (!raw) return fallback;
	
	const parsed = Number(raw);
	if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
	
	return parsed;
}

function stringFromEnv(name: string, fallback: string): string {
	const raw = process.env[name];
	if (raw === undefined || raw === null) return fallback;
	return String(raw);
}

function requiredStringFromEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`${name} is required`);
	}
	return value;
}

// ============================================================================
// CONFIG BUILDER
// ============================================================================

interface CommsConfig {
	COMMS_PORT: number;
	COMMS_HOST: string;
	REDIS_HOST: string;
	REDIS_PORT: number;
	USER_SERVICE_URL: string;
	JWT_SECRET: string;
	SERVICE_SECRET: string;
	NODE_ENV: string;
	LOG_LEVEL: string;
	WS_PING_INTERVAL_MS: number;
	WS_PONG_TIMEOUT_MS: number;
	WS_MAX_CONNECTIONS: number;
	WS_MAX_CONNECTIONS_PER_USER: number;
}

function buildConfig(): CommsConfig {
	return {
		COMMS_PORT: numberFromEnv('COMMS_PORT', DEFAULTS.COMMS_PORT),
		COMMS_HOST: stringFromEnv('COMMS_HOST', DEFAULTS.COMMS_HOST),
		
		REDIS_HOST: stringFromEnv('REDIS_HOST', DEFAULTS.REDIS_HOST),
		REDIS_PORT: numberFromEnv('REDIS_PORT', DEFAULTS.REDIS_PORT),
		
		USER_SERVICE_URL: stringFromEnv('USER_SERVICE_URL', DEFAULTS.USER_SERVICE_URL),
		
		JWT_SECRET: requiredStringFromEnv('JWT_SECRET'),
		SERVICE_SECRET: requiredStringFromEnv('SERVICE_SECRET'),
		
		NODE_ENV: stringFromEnv('NODE_ENV', DEFAULTS.NODE_ENV),
		LOG_LEVEL: stringFromEnv('LOG_LEVEL', DEFAULTS.LOG_LEVEL),
		
		WS_PING_INTERVAL_MS: numberFromEnv('COMMS_WS_PING_INTERVAL_MS', DEFAULTS.WS_PING_INTERVAL_MS),
		WS_PONG_TIMEOUT_MS: numberFromEnv('COMMS_WS_PONG_TIMEOUT_MS', DEFAULTS.WS_PONG_TIMEOUT_MS),
		WS_MAX_CONNECTIONS: numberFromEnv('COMMS_WS_MAX_CONNECTIONS', DEFAULTS.WS_MAX_CONNECTIONS),
		WS_MAX_CONNECTIONS_PER_USER: numberFromEnv('COMMS_WS_MAX_CONNECTIONS_PER_USER', DEFAULTS.WS_MAX_CONNECTIONS_PER_USER)
	};
}

// ============================================================================
// PUBLIC NAMESPACE WITH GETTERS
// ============================================================================

export namespace CommsEnv {
	let _config: CommsConfig | null = null;
	
	export function init(): void {
		if (_config) return;
		_config = buildConfig();
	}
	
	function cnf(): CommsConfig {
		if (!_config) {
			throw new Error('CommsEnv.init() no llamado');
		}
		return _config;
	}
	
	// Getters
	export function PORT(): number { return cnf().COMMS_PORT; }
	export function HOST(): string { return cnf().COMMS_HOST; }
	
	export function REDIS_HOST(): string { return cnf().REDIS_HOST; }
	export function REDIS_PORT(): number { return cnf().REDIS_PORT; }
	
	export function USER_SERVICE_URL(): string { return cnf().USER_SERVICE_URL; }
	
	export function JWT_SECRET(): string { return cnf().JWT_SECRET; }
	export function SERVICE_SECRET(): string { return cnf().SERVICE_SECRET; }
	
	export function NODE_ENV(): string { return cnf().NODE_ENV; }
	export function LOG_LEVEL(): string { return cnf().LOG_LEVEL; }
	
	export function WS_PING_INTERVAL_MS(): number { return cnf().WS_PING_INTERVAL_MS; }
	export function WS_PONG_TIMEOUT_MS(): number { return cnf().WS_PONG_TIMEOUT_MS; }
	export function WS_MAX_CONNECTIONS(): number { return cnf().WS_MAX_CONNECTIONS; }
	export function WS_MAX_CONNECTIONS_PER_USER(): number { return cnf().WS_MAX_CONNECTIONS_PER_USER; }
}