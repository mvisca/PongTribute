import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
	SharedEnv,
	findEnvFile,
	RedisConfig,
	validateRedisConfig
} from '@transcendence/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = findEnvFile(__dirname);
if (envPath) {
	dotenv.config({ path: envPath });
} else {
	dotenv.config();
}

export namespace BotEnv {

	let _config: ReturnType<typeof SharedEnv.build> | null = null;

	export function init(): void {
		if (_config) return;
		_config = SharedEnv.build();
	}

	function cnf() {
		if (!_config) throw new Error('BotEnv.init() no llamado');
		return _config;
	}

	// ── Fastify config (mismo patrón que auth, game, gateway) ────────────

	export function getFastifyConfig() {
		return {
			logger: {
				level: LOG_LEVEL(),
				...(NODE_ENV() === 'development' && {
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

	// ── Variables de SharedEnv que el bot consume ─────────────────────────

	export function NODE_ENV(): string { return cnf().NODE_ENV; }
	export function LOG_LEVEL(): string { return cnf().LOG_LEVEL; }
	export function JWT_SECRET(): string { return cnf().JWT_SECRET; }

	// ── Variables específicas del bot ─────────────────────────────────────
	// No están en SharedEnv, las leemos directamente con fallback.

	export function PORT(): number {
		return parseInt(process.env['BOT_SERVICE_PORT'] ?? '3007', 10);
	}

	export function HOST(): string {
		return process.env['BOT_SERVICE_HOST'] ?? '0.0.0.0';
	}

	// ── Helper: URL WebSocket del gateway ────────────────────────────────
	// Convierte "http://host:3000" → "ws://host:3000/api/game/ws"
	export function GAME_WS_URL(): string {
		const gatewayUrl = process.env['GATEWAY_URL'] ?? 'http://localhost:3000';
		return gatewayUrl.replace(/^http/, 'ws') + '/api/game/ws';
	}

	// ── Redis ─────────────────────────────────────────────────────────────

	export function getRedisConfig(): RedisConfig {
		const c = cnf();
		const config: RedisConfig = {
			host: c.REDIS_HOST,
			port: c.REDIS_PORT,
			password: c.REDIS_PASSWORD,
			db: c.REDIS_DB,
			maxRetriesPerRequest: 3,
			connectTimeout: 10000,
			lazyConnect: false,
			enableReadyCheck: true,
		};
		if (!validateRedisConfig(config))
			throw new Error('Configuración de Redis inválida');
		return config;
	}
}