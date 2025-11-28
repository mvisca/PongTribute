import { SharedEnv } from '@transcendence/shared';

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
		ajv?: {
			customOptions?: {
				removeAdditional?: boolean | 'all' | 'failing';
				coerceTypes?: boolean;
				useDefaults?: boolean;
			};
		};
	}

	// =====================================================
	// INICIALIZAR
	// =====================================================

	const sharedEnv = SharedEnv.build();

	// =====================================================
	// EXPORTS PÚBLICOS - VALORES
	// =====================================================

	const jwtSecret = sharedEnv.JWT_SECRET;
	const serviceSecret = sharedEnv.SERVICE_SECRET;
	const userServiceUrl = sharedEnv.USER_SERVICE_URL;
	const authServiceUrl = sharedEnv.AUTH_SERVICE_URL;
	const bcryptRounds = sharedEnv.BCRYPT_ROUNDS;
	
	if (!jwtSecret || !serviceSecret || !userServiceUrl || !authServiceUrl || !bcryptRounds) {
		console.error('Faltan ENV VARS. Crea un .env de .env.example:');
		console.error('@/transcendence: cp .env.example .env');
		console.error('Edita con tus valores');
		process.exit(1);
	}

	export const PORT: number = sharedEnv.USER_SERVICE_PORT;
	export const HOST: string = sharedEnv.USER_SERVICE_HOST;
	export const NODE_ENV: string = sharedEnv.NODE_ENV;
	export const LOG_LEVEL: string = sharedEnv.LOG_LEVEL;
	export const DB_PATH: string = sharedEnv.DB_PATH;
	
	export const SERVICE_SECRET: string = sharedEnv.SERVICE_SECRET;
	export const JWT_SECRET: string = sharedEnv.JWT_SECRET;
	export const BCRYPT_ROUNDS: number = sharedEnv.BCRYPT_ROUNDS; 

	// =====================================================
	// EXPORTS PÚBLICOS - OBJETOS
	// =====================================================

	export const serverConfig: ServiceConfig = {
		port: PORT,
		host: HOST,
		nodeEnv: NODE_ENV as ServiceConfig['nodeEnv'],
		logLevel: LOG_LEVEL as ServiceConfig['logLevel'],
		dbPath: DB_PATH
	};

	// =====================================================
	// EXPORTS PÚBLICOS - FUNCIONES
	// =====================================================

	export function getFastifyConfig(): FastifyConfig {
		return {
			logger: {
				level: serverConfig.logLevel,
				...(serverConfig.nodeEnv === 'development' && {
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
}