import { FastifyPluginAsync } from "fastify";
import type { Redis } from "ioredis";
import { HealthController } from "../controllers/health.controller.js";

export const healthRoutes: FastifyPluginAsync<{ redisClient: Redis | null }> = async (app, opts) => {
	// Crear el controller con Redis client
	const controller = new HealthController(opts.redisClient);

	/**
	 * Health check endpoint
	 */
	app.get('/health', async (request, reply) => {
		return controller.handleHealthCheck(request, reply);
	});
};
