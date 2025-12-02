import { Redis } from 'ioredis';
import type { RedisOptions } from 'ioredis';
import {
	RedisConfig, 
	validateRedisConfig,
	REDIS_DEFAULTS,
	defautlRetryStrategy } from './../config/index.js';

/** Crear instancia de clietne Redis con configuracion validada */
export function createRedisClient(config: RedisConfig): Redis {

	if (!validateRedisConfig(config))
		throw new Error('Configuración de Redis inválida');

	const finalConfig: RedisOptions = {
		...REDIS_DEFAULTS,
		...config,
		retryStrategy: config.retryStrategy || defautlRetryStrategy,
	};
	
	const client = new Redis(finalConfig);

	client.on('connect', () => {
		console.log(`Redis conectado a ${finalConfig.host}:${finalConfig.port}`);
	});

	client.on('ready', () => {
		console.log(`Redis listo para recibir comandos`);
	});

	client.on('close', () => {
		console.log(`Redis conexión cerrada`);
	});

	return client;
}