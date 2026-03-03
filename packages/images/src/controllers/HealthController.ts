import type { FastifyRequest, FastifyReply } from 'fastify';
import type { HealthCheckDependency, HealthCheckResponse } from '@transcendence/shared';
import { CloudinaryService } from '../services/CloudinaryService.js';

export class HealthController {
	private cloudinaryService: CloudinaryService | null;

	constructor(cloudinaryService: CloudinaryService | null = null) {
		this.cloudinaryService = cloudinaryService;
	}

	async handleHealthCheck(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<HealthCheckResponse> {
		const checks: Record<string, HealthCheckDependency> = {};
		let allHealthy = true;

		if (this.cloudinaryService) {
			try {
				await this.cloudinaryService.ping();
				checks.cloudinary = { status: 'ok' };
			} catch (error) {
				checks.cloudinary = {
					status: 'unreachable',
					error: error instanceof Error ? error.message : String(error)
				};
				allHealthy = false;
			}
		}

		const statusCode = allHealthy ? 200 : 503;
		reply.status(statusCode);

		return {
			status: allHealthy ? 'ok' : 'degraded',
			service: 'IMAGES SERVICE',
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			dependencies: checks
		};
	}
}
