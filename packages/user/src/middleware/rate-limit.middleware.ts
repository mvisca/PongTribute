import { FastifyRequest, FastifyReply } from 'fastify';
import { Redis } from 'ioredis';

interface RateLimitConfig {
	windowMs: number;
	maxRequests: number;
	keyPrefix: string;
}

export class RateLimitMiddleware {
	private redis: Redis;
	private config: RateLimitConfig;

	constructor(redisClient: Redis, config: RateLimitConfig) {
		this.redis = redisClient;
		this.config = config;
	}

	async checkLimit(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const userId = (request as any).user?.id;

			if (!userId) {
				return reply.code(401).send({ error: 'No autorizado' });
			}

			const key = `${this.config.keyPrefix}:${userId}`;
			const current = await this.redis.get(key);
			const count = current ? parseInt(current, 10) : 0;

			if (count >= this.config.maxRequests) {
				const ttl = await this.redis.ttl(key);

				return reply.code(429).send({
					error: 'Demasiadas solicitudes',
					message: `Has excedido el limte de ${this.config.maxRequests} uploads por hora`,
					retryAfter: ttl > 0 ? ttl : Math.floor(this.config.windowMs / 1000)
				})
			}

			const newCount = await this.redis.incr(key);

			if (newCount === 1)
				await this.redis.expire(key, Math.floor(this.config.windowMs/ 1000));

			reply.header('X-Rate-Limit', this.config.maxRequests.toString());
			reply.header('X-RateLimit-Remaining', (this.config.maxRequests - newCount).toString());
		} catch(err) {
			console.error('[USER-MIDDLEWARE] Rate limit error: ', err);
		}
	}

	async resetTime(userId: string): Promise<void> {
		const key = `${this.config.keyPrefix}:${userId}`;
		await this.redis.del(key);
	}
}