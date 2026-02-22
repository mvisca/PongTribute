import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Redis } from 'ioredis';
import type { HealthCheckDependency, HealthCheckResponse } from '@transcendence/shared';

export class HealthController {
	private redisClient: Redis;

	constructor(redisClient: Redis) {
		this.redisClient = redisClient;
	}

	async handleHealthCheck(request: FastifyRequest, reply: FastifyReply): Promise<HealthCheckResponse> {
		const checks: Record<string, HealthCheckDependency> = {};
		let allHealthy = true;

		// Verificar Redis
		try {
			const redisStatus = await this.redisClient.ping();
			checks.redis = { status: redisStatus === 'PONG' ? 'ok' : 'unhealthy' };
			if (redisStatus !== 'PONG') allHealthy = false;
		} catch (error: any) {
			checks.redis = { status: 'unreachable', error: error.message };
			allHealthy = false;
		}

		const statusCode = allHealthy ? 200 : 503;
		reply.status(statusCode);

		return {
			status: allHealthy ? 'ok' : 'degraded',
			service: 'AUTH SERVICE',
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			dependencies: checks
		};
	}
}
