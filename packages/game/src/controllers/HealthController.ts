import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Redis } from 'ioredis';
import type { HealthCheckDependency, HealthCheckResponse } from '@transcendence/shared';
import { getDatabase } from '../connection.js';

/**
 * Controller para manejar el health check del servicio de juegos
 */
export class HealthController {
	private redisClient: Redis | null;

	constructor(redisClient: Redis | null = null) {
		this.redisClient = redisClient;
	}

	/**
	 * Maneja el health check del servicio
	 */
	async handleHealthCheck(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<HealthCheckResponse> {
		const checks: Record<string, HealthCheckDependency> = {};
		let allHealthy = true;

		// Verificar Redis
		if (this.redisClient) {
			try {
				const redisStatus = await this.redisClient.ping();
				checks.redis = { status: redisStatus === 'PONG' ? 'ok' : 'unhealthy' };
				if (redisStatus !== 'PONG') allHealthy = false;
			} catch (error: any) {
				checks.redis = { status: 'unreachable', error: error.message };
				allHealthy = false;
			}
		} else {
			checks.redis = { status: 'not_initialized', error: 'Redis client not initialized' };
			allHealthy = false;
		}

		try {
			const db = getDatabase();
			db.prepare('SELECT 1').get();
			checks.database = { status: 'ok' };
		} catch(err: any) {
			checks.databse = { status: 'unreachable', error: err.message };
			allHealthy = false;
		}

		const statusCode = allHealthy ? 200 : 503;
		reply.status(statusCode);

		return {
			status: allHealthy ? 'ok' : 'degraded',
			service: 'GAME SERVICE',
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			dependencies: checks
		};
	}
}
