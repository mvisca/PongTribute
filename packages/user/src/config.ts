import * as dotenv from 'dotenv';
import path from 'path'; 

// =====================================================
// TIPOS
// =====================================================

/**
 * Configuración general del serivicio de base de datos
 */
export interface ServiceConfig {
	port: number;
	host: string;
	nodeEnv: 'development' | 'production' | 'test';
	logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
	dbPath: string;
}

/**
 * Opciones para el cosntructor de Fastify
 */
export interface FastifyConfig {
	logger: {
		level: string;
		transport?:{
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
	}
}

// =====================================================
// CARGAR .ENV
// =====================================================

dotenv.config({
	path: path.resolve(__dirname, '../.env'),
	quiet: true,
	override: false
});

// =====================================================
// CONFIGURACION  GENERAL
// =====================================================

/**
 * Generar un objeto de configuración de servidor fastify\
 * @throws error si port no existe o está fuera de rango (1024 <> 65535)\
 * @returns un objeto de configuración
 */
export const config: ServiceConfig = {
	port: parseInt(process.env.PORT || '3333', 10), 
	host: process.env.HOST || 'localhost',
	nodeEnv: (process.env.NODE_ENV || 'development') as ServiceConfig['nodeEnv'],
	logLevel: (process.env.LOG_LEVEL || 'info') as ServiceConfig['logLevel'],
	dbPath: (
		process.env.DB_PATH || 
		path.resolve(__dirname, '../../db-data/transcendence.db')
	)
};

// =====================================================
// VALIDACION 
// =====================================================

/**
 * Valida que port esté en el rango válido\
 * @throws error si el puerto es inválido
 */
function validatePort(port: number): void {
	if (!port || port < 1024 || port > 65535) {
		throw new Error(
			`[${__dirname}] : ${__filename}] Puerto inválido: ${port}. Debe estar entre 1024-65535`
		);
	}
}

/**
 * Valida que NODE_ENV sea válido\
 * @throws error si node env es inválido
 */
function validateNodeEnv(env: string): void {
	const validEnvs = ['development', 'production', 'test'];
	if (!validEnvs.includes(env)) {
		throw new Error(
			`[${__dirname}] : ${__filename}] NODE_ENV inválido: ${env}. Debe ser: ${validEnvs.join(', ')}`
		);
	}
}

validatePort(config.port);
validateNodeEnv(config.nodeEnv); //TODO que hacen estos así

// =====================================================
// CONFIGURACION FASTIFY
// =====================================================

/**
 * Genera la configuración de Fastify
 * @returns configuracion de Fastify
 */
export function getFastifyConfig(): FastifyConfig {
	return {
		logger: {
			level: config.logLevel,
			...(config.nodeEnv == 'development' && {
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