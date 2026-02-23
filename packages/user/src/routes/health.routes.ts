import { FastifyPluginAsync } from "fastify";
import { HealthController } from "../controllers/health.controller.js";
import { UserAppDependencies } from "../app.js";

export const healthRoutes: FastifyPluginAsync<UserAppDependencies> = async (app, opts) => {
	// Crear el controller con Redis client
	const controller = new HealthController(opts.redisClient);

	/**
	 * Health check endpoint
	 */
	app.get('/health', async (request, reply) => {
		return controller.handleHealthCheck(request, reply);
	});
};
