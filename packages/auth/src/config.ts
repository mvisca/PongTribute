import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { SharedEnv, RedisConfig, validateRedisConfig, findEnvFile } from '@transcendence/shared';

// =====================================================
// CARGA DE ENTORNO
// =====================================================

// Recrear __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar .env explícitamente antes de build()
const envPath = findEnvFile(__dirname);
if (envPath) {
	dotenv.config({ path: envPath });
} else {
	dotenv.config();
}


export namespace AuthEnv {
	
	// =====================================================
	// TIPOS
	// =====================================================
	export interface ServiceConfig {
		port: number;
		host: string;
		nodeEnv: 'development' | 'production' | 'test';
		logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
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

	let _config: ReturnType<typeof SharedEnv.build> | null = null

	// =====================================================
	// INICIALIZAR - llamar en server.ts dentro de try-catch
	// =====================================================
	
	export function init():void {
		if (_config)
			return;
		_config = SharedEnv.build(); // puede lanzar error hacia server.ts
	}

	// Validación interna de que se ha llamado init()
	function cnf() {
		if (!_config) 
			throw new Error('AuthEnv.init() no llamado');
		return _config;
	}

	// =====================================================
	// GETTERS
	// =====================================================

	export function NODE_ENV(): string { return cnf().NODE_ENV; }
	
	export function PORT(): number { return cnf().AUTH_SERVICE_PORT; }
	export function HOST(): string { return cnf().AUTH_SERVICE_HOST; }
	
	export function LOG_LEVEL(): string { return cnf().LOG_LEVEL; }
	
	export function UNIQUE_SESSION(): boolean { return cnf().UNIQUE_SESSION; }
	export function JWT_SECRET(): string { return cnf().JWT_SECRET; }
	export function TOKEN_EXPIRY(): number { return cnf().TOKEN_EXPIRY; }
	export function REFRESH_TOKEN_EXPIRY(): number { return cnf().REFRESH_TOKEN_EXPIRY; }
	export function SERVICE_SECRET(): string { return cnf().SERVICE_SECRET; }
	export function CLOUDINARY_DEFAULT_AVATAR(): string { return cnf().CLOUDINARY_DEFAULT_AVATAR; }
	
	export function REDIS_HOST(): string { return cnf().REDIS_HOST; }
	export function REDIS_PORT(): number { return cnf().REDIS_PORT; }
	export function REDIS_PASSWORD(): string { return cnf().REDIS_PASSWORD; }
	export function REDIS_DB(): number { return cnf().REDIS_DB; }
	
	export function USER_SERVICE_URL(): string {
		console.log("ESTA ES USER SERVIE URL" + cnf().USER_SERVICE_URL);
		return cnf().USER_SERVICE_URL;
	} // DEBUGGING
	export function AUTH_SERVICE_URL(): string { return cnf().AUTH_SERVICE_URL; }
	export function IMAGE_SERVICE_URL(): string { return cnf().IMAGE_SERVICE_URL; }
	
	// =====================================================
	// EXPORTS - FUNCIONES HELPER
	// =====================================================
	
	export function serverConfig(): ServiceConfig {
		const configValut = cnf();

		return {
			port: configValut.AUTH_SERVICE_PORT,
			host: configValut.AUTH_SERVICE_HOST,
			nodeEnv: configValut.NODE_ENV as ServiceConfig['nodeEnv'],
			logLevel: configValut.LOG_LEVEL as ServiceConfig['logLevel'],
		}
	};
	
	export function getFastifyConfig(): FastifyConfig {
		const configValut = cnf();

		return {
			logger: {
				level: configValut.LOG_LEVEL,
				...(configValut.NODE_ENV === 'development' && {
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
		const configValut = cnf();

		const redisConfig = {
			host: configValut.REDIS_HOST,
			port: configValut.REDIS_PORT,
			password: configValut.REDIS_PASSWORD,
			db: configValut.REDIS_DB,
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