import { Redis, RedisOptions } from 'ioredis';

/** Configuración para clientes Redis */
export interface RedisConfig {
	host: string;
	port: number;
	password: string;
	db: number;
	maxRetriesPerRequest: number | null; // null => infinito
	connectTimeout: number;
	lazyConnect: boolean;
	enableRetryCheck: boolean;
	retryStrategy?: (times: number) => number | void | null;	
}

/** Alias de RedisConfig */
export type RedisClientOptions = RedisConfig;

/** Valores default recomendados para Redis */
export const REDIS_DEFAULTS: Partial<RedisConfig> = {
	port: 6379,
	db: 0,
	maxRetriesPerRequest: 3,
	connectTimeout: 10000,
	lazyConnect: false,
	enableRetryCheck: true
};

/** Reconexión con backoff */
export function defautlRetryStrategy(times: number): number | void | null {
	if (times > 10)
		throw new Error('Máximo número de reintentos alcanzado');
	const calcDelay = Math.min(times * 100, 3000);
	return calcDelay;
}

/** Valida que la configuración Redis sea correcta */
export function validateRedisConfig(config: RedisConfig): boolean {
	if (config.port < 1 || config.port > 65535)
		return false;

	if (config.db < 0 || config.db > 15)
		return false;

	if (config.connectTimeout < 1000)
		return false;

	return true;
}
// TODO buscar cualquier uso de type Boolean y reemplazar por boolean