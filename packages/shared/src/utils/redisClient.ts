import { Redis } from 'ioredis';
import type { RedisOptions } from 'ioredis';
import {
	RedisConfig, 
	validateRedisConfig,
	REDIS_DEFAULTS,
	defaultRetryStrategy } from './../config/index.js';

// packages/shared/src/utils/redis.utils.ts

/** Crear instancia de cliente Redis con configuración validada */
// 1: Aceptamos Partial<RedisConfig> para permitir sobrescribir solo lo necesario
export function createRedisClient(config: Partial<RedisConfig>): Redis {

    // 1. Mezclamos los defaults con la config parcial del usuario
    const finalConfig: RedisOptions = {
        ...REDIS_DEFAULTS,
        ...config,
        retryStrategy: config.retryStrategy || defaultRetryStrategy,
    };
      
    // 2: Validamos el objeto FINAL (que ya tiene los defaults), no el parcial
    // Hacemos cast a RedisConfig porque ya debería estar completo tras el merge
    if (!validateRedisConfig(finalConfig as RedisConfig))
        throw new Error('Configuración de Redis inválida tras aplicar defaults');

    const client = new Redis(finalConfig);

    client.on('connect', () => {
        console.log(`[REDIS] Connected to ${finalConfig.host}:${finalConfig.port}`);
    });

    client.on('ready', () => {
        console.log(`[REDIS] Ready to receive commands`);
    });

    client.on('close', () => {
        console.log(`[REDIS] Connection closed`);
    });
    
    client.on('error', (err) => {
        console.error(`[REDIS] Error:`, err);
    });

    return client;
}