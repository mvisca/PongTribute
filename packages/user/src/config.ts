import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Recrear __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { SharedEnv, findEnvFile, RedisConfig, validateRedisConfig } from '@transcendence/shared';

// Cargar .env explícitamente antes de build()
const envPath = findEnvFile(__dirname);
if (envPath) {
	dotenv.config({ path: envPath });
} else {
	dotenv.config();
}

// =====================================================
// TIPOS
// =====================================================

export namespace UserEnv {
	export interface ServiceConfig {
		port: number;
		host: string;
		nodeEnv: 'development' | 'production' | 'test';
		logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
		dbPath: string;
	}

	export interface FastifyConfig {
		logger: {
			level: string;
			transport?: {
				target: string;
				options: {
					colorize: boolean;
					translateTime: string;
					ignore: string;
				};
			};
		} | boolean;
		bodyLimit?: number;
		ajv?: {
			customOptions?: {
				removeAdditional?: boolean | 'all' | 'failing';
				coerceTypes?: boolean;
				useDefaults?: boolean;
			};
		};
	}

	// =====================================================
	// ESTADO PRIVADO
	// =====================================================

	let _config: ReturnType<typeof SharedEnv.build> | null = null;

	// =====================================================
	// INICIALIZAR - llamar en server.ts dentro de try-catch
	// =====================================================

	export function init(): void {
		if (_config)
			return;
		_config = SharedEnv.build(); // puede lanzar error hacia server.ts
	}

	// Validación interna de que se ha llamado init()
	function cnf() {
		if (!_config)
			throw new Error('UserEnv.init() no llamado');
		return _config;
	}

	// GLOBAL
	export function NODE_ENV(): string { return cnf().NODE_ENV; }
	export function LOG_LEVEL(): string { return cnf().LOG_LEVEL; }

	// USER SERVICE
	export function PORT(): number { return cnf().USER_SERVICE_PORT; }
	export function HOST(): string { return cnf().USER_SERVICE_HOST; }
	export function JWT_SECRET(): string { return cnf().JWT_SECRET; }
	export function SERVICE_SECRET(): string { return cnf().SERVICE_SECRET; }
	export function BCRYPT_ROUNDS(): number { return cnf().BCRYPT_ROUNDS; }
	export function USER_SERVICE_DB_FULL_PATH(): string { return cnf().USER_SERVICE_DB_FULL_PATH; }

	// IMAGE SERVICE
	export function IMAGE_SERVICE_URL(): string { return cnf().IMAGE_SERVICE_URL; }
	export function CLOUDINARY_URL(): string { return cnf().CLOUDINARY_URL; }
	export function CLOUDINARY_CLOUD_NAME(): string { return cnf().CLOUDINARY_CLOUD_NAME; }
	export function CLOUDINARY_API_KEY(): string { return cnf().CLOUDINARY_API_KEY; }
	export function CLOUDINARY_API_SECRET(): string { return cnf().CLOUDINARY_API_SECRET; }
	export function CLOUDINARY_DEFAULT_AVATAR(): string { return cnf().CLOUDINARY_DEFAULT_AVATAR; }

	// REDIS
	export function REDIS_HOST(): string { return cnf().REDIS_HOST; }
	export function REDIS_PORT(): number { return cnf().REDIS_PORT; }
	export function REDIS_PASSWORD(): string { return cnf().REDIS_PASSWORD; }
	export function REDIS_DB(): number { return cnf().REDIS_DB; }

	// =====================================================
	// HELPERS
	// =====================================================

	export function serverConfig(): ServiceConfig {
		const configValue = cnf();

		return {
			port: configValue.USER_SERVICE_PORT,
			host: configValue.USER_SERVICE_HOST,
			nodeEnv: configValue.NODE_ENV as ServiceConfig['nodeEnv'],
			logLevel: configValue.LOG_LEVEL as ServiceConfig['logLevel'],
			dbPath: configValue.USER_SERVICE_DB_FULL_PATH
		};
	}

	export function getFastifyConfig(): FastifyConfig {
		const configValue = cnf();

		return {
			logger: {
				level: configValue.LOG_LEVEL,
				...(configValue.NODE_ENV === 'development' && {
					transport: {
						target: 'pino-pretty',
						options: {
							colorize: true,
							translateTime: 'HH:MM:ss Z',
							ignore: 'pid,hostname'
						}
					}
				})
			},
			bodyLimit: 14 * 1024 * 1024,
			ajv: {
				customOptions: {
					removeAdditional: false,
					coerceTypes: true,
					useDefaults: true
				}
			}
		};
	}

	export function getRedisConfig(): RedisConfig {
		const configValue = cnf();

		const redisConfig: RedisConfig = {
			host: configValue.REDIS_HOST,
			port: configValue.REDIS_PORT,
			password: configValue.REDIS_PASSWORD,
			db: configValue.REDIS_DB,
			maxRetriesPerRequest: 3,
			connectTimeout: 10000,
			lazyConnect: false,
			enableReadyCheck: true
		};

		if (!validateRedisConfig(redisConfig))
			throw new Error('Configuración de Redis inválida');

		return redisConfig;
	}
}