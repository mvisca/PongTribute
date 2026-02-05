import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyServerOptions } from 'fastify';
import { findEnvFile } from '@transcendence/shared';

/**
 * Load environment variables
 * In Docker, env vars are passed directly via env_file, so .env file may not exist
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = findEnvFile(__dirname);
if (envPath) {
	dotenv.config({ path: envPath });
}
// Variables are available either from .env file or from Docker environment

/**
 * Defaults
 */
const DEFAULTS = {
	GATEWAY_PORT: 3000,
	GATEWAY_HOST: '0.0.0.0',

	AUTH_SERVICE_URL: 'http://auth:3002',
	AUTH_OPENAPI_PATH: '/docs/json',

	USER_SERVICE_URL: 'http://user:3001',
	USER_OPENAPI_PATH: '/docs/json',

	GAME_SERVICE_URL: 'http://game:3003',
	GAME_OPENAPI_PATH: '/docs/json',

	COMMS_SERVICE_URL: 'http://comms:3005',
	COMMS_OPENAPI_PATH: 'docs/json',

	CORS_ORIGIN: 'http://localhost:5173',

	NODE_ENV: 'development',
	LOG_LEVEL: 'info',

	UPSTREAM_TIMEOUT_MS: 10_000,
	BODY_LIMIT: 10 * 1024 * 1024, // 10MB

	// WebSocket defaults
	WS_ALLOWED_ORIGINS: '',
	WS_MAX_CONNECTIONS: 1000,
	WS_MAX_CONNECTIONS_PER_IP: 10,
	WS_UPSTREAM_OPEN_TIMEOUT_MS: 5_000,
	WS_PONG_TIMEOUT_MS: 10_000,
	WS_PING_INTERVAL_MS: 30_000,
	WS_MAX_BUFFERED_AMOUNT_BYTES: 1024 * 1024, // 1MB
	WS_MAX_BUFFERED_MESSAGES: 100,
	WS_MAX_BUFFERED_BYTES: 1024 * 1024 // 1MB
} as const;

/**
 * Helpers
 */
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

/**
 * Public gateway configuration
 */
export const GatewayEnv = {
	PORT: numberFromEnv('GATEWAY_PORT', DEFAULTS.GATEWAY_PORT),
	HOST: process.env.GATEWAY_HOST || DEFAULTS.GATEWAY_HOST,

	AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || DEFAULTS.AUTH_SERVICE_URL,
	AUTH_OPENAPI_PATH: process.env.AUTH_OPENAPI_PATH || DEFAULTS.AUTH_OPENAPI_PATH,

	USER_SERVICE_URL: process.env.USER_SERVICE_URL || DEFAULTS.USER_SERVICE_URL,
	USER_OPENAPI_PATH: process.env.USER_OPENAPI_PATH || DEFAULTS.USER_OPENAPI_PATH,

	GAME_SERVICE_URL: process.env.GAME_SERVICE_URL || DEFAULTS.GAME_SERVICE_URL,
	GAME_OPENAPI_PATH: process.env.GAME_OPENAPI_PATH || DEFAULTS.GAME_OPENAPI_PATH,

	COMMS_SERVICE_URL: process.env.COMMS_SERVICE_URL || DEFAULTS.COMMS_SERVICE_URL,
	COMMS_OPENAPI_PATH: process.env.COMMS_OPENAPI_PATH || DEFAULTS.COMMS_OPENAPI_PATH,

	CORS_ORIGIN: process.env.CORS_ORIGIN || DEFAULTS.CORS_ORIGIN,

	NODE_ENV: process.env.NODE_ENV || DEFAULTS.NODE_ENV,
	LOG_LEVEL: process.env.LOG_LEVEL || DEFAULTS.LOG_LEVEL,

	UPSTREAM_TIMEOUT_MS: numberFromEnv('GATEWAY_TIMEOUT_MS', DEFAULTS.UPSTREAM_TIMEOUT_MS),
	BODY_LIMIT: numberFromEnv('GATEWAY_BODY_LIMIT', DEFAULTS.BODY_LIMIT),

	// WebSocket configuration
	WS_ALLOWED_ORIGINS: stringFromEnv('WS_ALLOWED_ORIGINS', DEFAULTS.WS_ALLOWED_ORIGINS),
	WS_MAX_CONNECTIONS: numberFromEnv('WS_MAX_CONNECTIONS', DEFAULTS.WS_MAX_CONNECTIONS),
	WS_MAX_CONNECTIONS_PER_IP: numberFromEnv('WS_MAX_CONNECTIONS_PER_IP', DEFAULTS.WS_MAX_CONNECTIONS_PER_IP),
	WS_UPSTREAM_OPEN_TIMEOUT_MS: numberFromEnv('WS_UPSTREAM_OPEN_TIMEOUT_MS', DEFAULTS.WS_UPSTREAM_OPEN_TIMEOUT_MS),
	WS_PONG_TIMEOUT_MS: numberFromEnv('WS_PONG_TIMEOUT_MS', DEFAULTS.WS_PONG_TIMEOUT_MS),
	WS_PING_INTERVAL_MS: numberFromEnv('WS_PING_INTERVAL_MS', DEFAULTS.WS_PING_INTERVAL_MS),
	WS_MAX_BUFFERED_AMOUNT_BYTES: numberFromEnv('WS_MAX_BUFFERED_AMOUNT_BYTES', DEFAULTS.WS_MAX_BUFFERED_AMOUNT_BYTES),
	WS_MAX_BUFFERED_MESSAGES: numberFromEnv('WS_MAX_BUFFERED_MESSAGES', DEFAULTS.WS_MAX_BUFFERED_MESSAGES),
	WS_MAX_BUFFERED_BYTES: numberFromEnv('WS_MAX_BUFFERED_BYTES', DEFAULTS.WS_MAX_BUFFERED_BYTES)
} as const;

/**
 * Fastify logger configuration
 */
export function getFastifyConfig(): FastifyServerOptions {
	const isDev = GatewayEnv.NODE_ENV === 'development';

	return {
		logger: {
			level: GatewayEnv.LOG_LEVEL,
			...(isDev && {
				transport: {
					target: 'pino-pretty',
					options: {
						colorize: true,
						translateTime: 'HH:MM:ss Z',
						ignore: 'pid,hostname'
					}
				}
			}),
		}
	};
}
