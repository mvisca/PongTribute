import type { Redis } from 'ioredis';

/** Wrapper de Redis para operacion de cache */
export class RedisCache<T> {
	private readonly client: Redis;
	private readonly prefix: string;

	constructor(client: Redis, prefix: string = '') {
		this.client = client;
		this.prefix = prefix ? `${prefix}:` : '';
	}

	/** Agrega el prefix al key */
	private buildKey(key: string): string {
		return `${this.prefix}${key}`;
	}

	/** Almacenar valor en cache */
	async set(key: string, value: T, ttlSeconds?: number): Promise<void> {
		const fullKey = this.buildKey(key);
		const serialized = JSON.stringify(value);

		if (ttlSeconds) {
			await this.client.setex(fullKey, ttlSeconds, serialized);
		} else {
			await this.client.set(fullKey, serialized);
		}
	}

	/** Recuperar valor del cache */
	async get(key: string): Promise<T | null> {
		const fullKey = this.buildKey(key);
		const data = await this.client.get(fullKey);

		if (!data) {
			return null; // No existe o expiró
		}

		try {
			const parsed = JSON.parse(data); // Deserealizar
			return parsed as T; // Casetear a T
		} catch(err) {
			console.error(`Error deserializando key ${fullKey}: `, err);
			return null;
		}
	}

	/** Elimina key del cache */
	async delete(key: string): Promise<boolean> {
		const fullKey = this.buildKey(key);
		const deletedKeys = await this.client.del(fullKey);
		return deletedKeys > 0;
	}

	/** Verifica si key existe en cache */
	async exists(key: string): Promise<boolean> {
		const fullKey = this.buildKey(key);
		const existingKeys = await this.client.exists(fullKey);
		return existingKeys === 1;
	}

	/** Obtiene tiempo de vida restante */
	async ttl(key:string): Promise<number> {
		const fullKey = this.buildKey(key);
		const seconds = await this.client.ttl(fullKey);
		return seconds;
	}

	/** Elimina todas las keys con el prefix de esta instancia */
	async clear(): Promise<number> {
		if (!this.prefix) {
			throw new Error('No se puede limppiar cache sin prefix (safety check)');
		}

		const keys = await this.client.keys(`${this.prefix}*`);

		if (keys.length === 0) {
			return 0;
		}

		const result = await this.client.del(...keys);
		return result;
	}
}