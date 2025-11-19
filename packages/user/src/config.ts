import * as dotenv from 'dotenv';
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
		};
		ajv?: {
			customOptions?: {
				removeAdditional?: boolean | 'all' | 'failing';
				coerceTypes?: boolean;
				useDefaults?: boolean;
			};
		};
	}

	// =====================================================
	// CARGAR .ENV (PRIVADO)
	// =====================================================

	function loadEnv(): void {
		dotenv.config({
			path: '../../.env',
			quiet: true
		});
	}

	// =====================================================
	// VALIDACIÓN (PRIVADO)
	// =====================================================

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

	// =====================================================
	// INICIALIZAR
	// =====================================================

	loadEnv();
	const sharedEnv = SharedEnv.build();
	validateSecrets();

	// =====================================================
	// EXPORTS PÚBLICOS - VALORES
	// =====================================================

	export const PORT: number = sharedEnv.USER_SERVICE_PORT || 3001;
	export const HOST: string = sharedEnv.USER_SERVICE_HOST || 'localhost';
	export const NODE_ENV: string = sharedEnv.NODE_ENV || 'development';
	export const LOG_LEVEL: string = sharedEnv.LOG_LEVEL || 'info';
	export const DB_PATH: string = sharedEnv.DB_PATH || '../../db-data/user.db';

	export const SERVICE_SECRET: string = sharedEnv.SERVICE_SECRET!;

	// =====================================================
	// EXPORTS PÚBLICOS - OBJETOS
	// =====================================================

	validatePort(PORT);
	validateNodeEnv(NODE_ENV);

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