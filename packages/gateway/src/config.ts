import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyServerOptions } from 'fastify';
import { findEnvFile, SharedErrors } from '@transcendence/shared';

/**
 * Load environment variables
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = findEnvFile(__dirname);
if (!envPath) {
	throw new SharedErrors.ServiceError(
		'gateway', 
		`CRITICAL: .env file not found`,
		{ 'context': 'context' }
	);
} else {
  dotenv.config();
}
// TODO revisar carga del modulo en el import (top-level)

/**
 * Defaults
 */
const DEFAULTS = {
  GATEWAY_PORT: 3000,
  GATEWAY_HOST: '0.0.0.0',

  AUTH_SERVICE_URL: 'http://localhost:3002',
  AUTH_OPENAPI_PATH: '/docs/json',

  USER_SERVICE_URL: 'http://localhost:3001',
  USER_OPENAPI_PATH: '/docs/json',

  GAME_SERVICE_URL: 'http://localhost:3003',
  GAME_OPENAPI_PATH: '/docs/json',

  CORS_ORIGIN: 'http://localhost:5173',

  NODE_ENV: 'development',
  LOG_LEVEL: 'info',

  UPSTREAM_TIMEOUT_MS: 10_000,
  BODY_LIMIT: 10 * 1024 * 1024, // 10MB

  // =========================
  // WebSocket hardening
  // =========================
  // Coma-separated list. If empty, we fallback to CORS_ORIGIN.
  WS_ALLOWED_ORIGINS: '',
  // Max concurrent WS connections (global and per IP)
  WS_MAX_CONNECTIONS: 500,
  WS_MAX_CONNECTIONS_PER_IP: 50,
  // If upstream doesn't OPEN within this time, we fail the client connection.
  WS_UPSTREAM_OPEN_TIMEOUT_MS: 5_000,
  // Buffer messages client->upstream until upstream is OPEN (up to limits below)
  WS_MAX_BUFFERED_MESSAGES: 200,
  WS_MAX_BUFFERED_BYTES: 256 * 1024, // 256KB
  // Heartbeat (ping/pong)
  WS_PING_INTERVAL_MS: 15_000,
  WS_PONG_TIMEOUT_MS: 10_000,
  // Backpressure: close if bufferedAmount grows too much
  WS_MAX_BUFFERED_AMOUNT_BYTES: 2 * 1024 * 1024 // 2MB
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

  CORS_ORIGIN: process.env.CORS_ORIGIN || DEFAULTS.CORS_ORIGIN,

  NODE_ENV: process.env.NODE_ENV || DEFAULTS.NODE_ENV,
  LOG_LEVEL: process.env.LOG_LEVEL || DEFAULTS.LOG_LEVEL,

  UPSTREAM_TIMEOUT_MS: numberFromEnv('GATEWAY_TIMEOUT_MS', DEFAULTS.UPSTREAM_TIMEOUT_MS),
  BODY_LIMIT: numberFromEnv('GATEWAY_BODY_LIMIT', DEFAULTS.BODY_LIMIT),

  // WebSocket hardening
  WS_ALLOWED_ORIGINS: stringFromEnv('GATEWAY_WS_ALLOWED_ORIGINS', DEFAULTS.WS_ALLOWED_ORIGINS),
  WS_MAX_CONNECTIONS: numberFromEnv('GATEWAY_WS_MAX_CONNECTIONS', DEFAULTS.WS_MAX_CONNECTIONS),
  WS_MAX_CONNECTIONS_PER_IP: numberFromEnv('GATEWAY_WS_MAX_CONNECTIONS_PER_IP', DEFAULTS.WS_MAX_CONNECTIONS_PER_IP),
  WS_UPSTREAM_OPEN_TIMEOUT_MS: numberFromEnv(
    'GATEWAY_WS_UPSTREAM_OPEN_TIMEOUT_MS',
    DEFAULTS.WS_UPSTREAM_OPEN_TIMEOUT_MS
  ),
  WS_MAX_BUFFERED_MESSAGES: numberFromEnv('GATEWAY_WS_MAX_BUFFERED_MESSAGES', DEFAULTS.WS_MAX_BUFFERED_MESSAGES),
  WS_MAX_BUFFERED_BYTES: numberFromEnv('GATEWAY_WS_MAX_BUFFERED_BYTES', DEFAULTS.WS_MAX_BUFFERED_BYTES),
  WS_PING_INTERVAL_MS: numberFromEnv('GATEWAY_WS_PING_INTERVAL_MS', DEFAULTS.WS_PING_INTERVAL_MS),
  WS_PONG_TIMEOUT_MS: numberFromEnv('GATEWAY_WS_PONG_TIMEOUT_MS', DEFAULTS.WS_PONG_TIMEOUT_MS),
  WS_MAX_BUFFERED_AMOUNT_BYTES: numberFromEnv(
    'GATEWAY_WS_MAX_BUFFERED_AMOUNT_BYTES',
    DEFAULTS.WS_MAX_BUFFERED_AMOUNT_BYTES
  )
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
      })
    }
  };
}
