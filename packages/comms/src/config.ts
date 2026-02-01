// packages/comms/src/config.ts

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findEnvFile, RedisConfig, validateRedisConfig } from '@transcendence/shared';
import type { FastifyRequest } from 'fastify';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = findEnvFile(__dirname);
if (envPath) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

// ============================================================================
// TYPES
// ============================================================================

export namespace CommsEnv {

  export interface ServiceConfig {
    port: number;
    host: string;
    nodeEnv: 'development' | 'production' | 'test';
    logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
    
    redisHost: string;
    redisPort: number;
    redisPassword?: string;
    
    userServiceUrl: string;
    jwtSecret: string;
    serviceSecret: string;
    
    wsPingIntervalMs: number;
    wsPongTimeoutMs: number;
    wsMaxConnections: number;
    wsMaxConnectionsPerUser: number;
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
	  serializers?: {
		req?: (request: any) => any;
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

}

// ============================================================================
// CONFIGURATION
// ============================================================================

let config: CommsEnv.ServiceConfig | null = null;

function cnf(): CommsEnv.ServiceConfig {
  if (!config) {
    throw new Error('[CommsEnv] Config no inicializada. Llama a CommsEnv.init() primero.');
  }
  return config;
}

export namespace CommsEnv {
  
  // Inicializar configuración
  export function init(): void {
    config = {
      port: parseInt(process.env.COMMS_PORT || '3005', 10),
      host: process.env.COMMS_HOST || '0.0.0.0',
      nodeEnv: (process.env.NODE_ENV as any) || 'development',
      logLevel: (process.env.LOG_LEVEL as any) || 'info',
      
      redisHost: process.env.REDIS_HOST || 'localhost',
      redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
      redisPassword: process.env.REDIS_PASSWORD,
      
      userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3001',
      jwtSecret: process.env.JWT_SECRET || '',
      serviceSecret: process.env.SERVICE_SECRET || '',
      
      wsPingIntervalMs: parseInt(process.env.WS_PING_INTERVAL_MS || '30000', 10),
      wsPongTimeoutMs: parseInt(process.env.WS_PONG_TIMEOUT_MS || '5000', 10),
      wsMaxConnections: parseInt(process.env.WS_MAX_CONNECTIONS || '10000', 10),
      wsMaxConnectionsPerUser: parseInt(process.env.WS_MAX_CONNECTIONS_PER_USER || '5', 10),
    };
    
    console.log('[CommsEnv] Configuración cargada');
  }
  
  // Getters
  export function PORT(): number { return cnf().port; }
  export function HOST(): string { return cnf().host; }
  export function NODE_ENV(): string { return cnf().nodeEnv; }
  export function LOG_LEVEL(): string { return cnf().logLevel; }
  
  export function REDIS_HOST(): string { return cnf().redisHost; }
  export function REDIS_PORT(): number { return cnf().redisPort; }
  export function REDIS_PASSWORD(): string | undefined { return cnf().redisPassword; }
  
  export function USER_SERVICE_URL(): string { return cnf().userServiceUrl; }
  export function JWT_SECRET(): string { return cnf().jwtSecret; }
  export function SERVICE_SECRET(): string { return cnf().serviceSecret; }
  
  export function WS_PING_INTERVAL_MS(): number { return cnf().wsPingIntervalMs; }
  export function WS_PONG_TIMEOUT_MS(): number { return cnf().wsPongTimeoutMs; }
  export function WS_MAX_CONNECTIONS(): number { return cnf().wsMaxConnections; }
  export function WS_MAX_CONNECTIONS_PER_USER(): number { return cnf().wsMaxConnectionsPerUser; }
  
  // Config de Redis (pattern de otros servicios)
  export function getRedisConfig(): RedisConfig {
    const redisConfig: RedisConfig = {
      host: REDIS_HOST(),
      port: REDIS_PORT(),
      password: REDIS_PASSWORD() || '',
      db: parseInt(process.env.REDIS_DB || '0', 10),
      connectTimeout: 10000,
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3
    };
    
    validateRedisConfig(redisConfig);
    return redisConfig;
  }
  
  // Config de Fastify (pattern para todos los servicios)
  export function getFastifyConfig(): CommsEnv.FastifyConfig {
    const isDev = NODE_ENV() === 'development';
    
	const reqSerializer = (request: FastifyRequest) => {
		// Ignorar request '/health'
		if (request.url === '/health') {
			return undefined;
		}

		return {
			method: request.method,
			url: request.url,
			headers: request.headers,
			hostname: request.hostname,
			remoteAddress: request.ip
		};
	};

    return {
    	logger: isDev ? { 
		// EN DEVELOPMENT
			level: LOG_LEVEL(),
			transport: {
				target: 'pino-pretty',
				options: {
					colorize: true,
					translateTime: 'HH:MM:ss Z',
					ignore: 'pid,hostname'
				}
			},
			serializers: {
				req: reqSerializer
			}
		} : {
		// EN PRODUCTION
			level: LOG_LEVEL(),
			serializers: {
				req: reqSerializer
			}
		},
		ajv: {
			customOptions: {
				removeAdditional: 'all',
				coerceTypes: false,
				useDefaults: true
			}
		}
	};
  }

}