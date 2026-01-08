import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Recrear __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
	SharedEnv,
	findEnvFile,
	RedisConfig,
	validateRedisConfig } from '@transcendence/shared';
	
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
	
	export namespace AuthEnv {
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
		// INICIALIZAR
		// =====================================================
		
		const sharedEnv = SharedEnv.build();
		
		// =====================================================
		// EXPORTS PÚBLICOS - VALORES
		// =====================================================

		export const NODE_ENV: string = sharedEnv.NODE_ENV;
		
		export const PORT: number = sharedEnv.AUTH_SERVICE_PORT;
		export const HOST: string = sharedEnv.AUTH_SERVICE_HOST;
		
		export const LOG_LEVEL: string = sharedEnv.LOG_LEVEL;
		
		export const UNIQUE_SESSION: boolean = sharedEnv.UNIQUE_SESSION;
		export const JWT_SECRET: string = sharedEnv.JWT_SECRET;
		export const TOKEN_EXPIRY: number = sharedEnv.TOKEN_EXPIRY;
		export const SERVICE_SECRET: string = sharedEnv.SERVICE_SECRET;
		export const CLOUDINARY_DEFAULT_AVATAR: string = sharedEnv.CLOUDINARY_DEFAULT_AVATAR;

		export const REDIS_HOST: string = sharedEnv.REDIS_HOST;
		export const REDIS_PORT: number = sharedEnv.REDIS_PORT;
		export const REDIS_PASSWORD: string = sharedEnv.REDIS_PASSWORD;
		export const REDIS_DB: number = sharedEnv.REDIS_DB;

		export const USER_SERVICE_URL: string = sharedEnv.USER_SERVICE_URL;
		export const AUTH_SERVICE_URL: string = sharedEnv.AUTH_SERVICE_URL;
		export const IMAGE_SERVICE_URL: string = sharedEnv.IMAGE_SERVICE_URL;
		
		// =====================================================
		// EXPORTS PÚBLICOS - OBJETOS
		// =====================================================
		
		export const serverConfig: ServiceConfig = {
			port: PORT,
			host: HOST,
			nodeEnv: NODE_ENV as ServiceConfig['nodeEnv'],
			logLevel: LOG_LEVEL as ServiceConfig['logLevel'],
		};
		
		// =====================================================
		// EXPORTS PÚBLICOS - FUNCIONES DE OBJETOS CONFIG
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
		
		export function getRedisConfig(): RedisConfig {
			const config = {
				host: REDIS_HOST,
				port: REDIS_PORT,
				password: REDIS_PASSWORD,
				db: REDIS_DB,
				maxRetriesPerRequest: 3,
				connectTimeout: 10000,
				lazyConnect: false,
				enableReadyCheck: true
			};
			
			if (!validateRedisConfig(config))
				throw new Error('Configuración de Redis inválida');
			
			return config;
		}
	}