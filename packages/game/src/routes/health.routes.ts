import { FastifyPluginAsync } from "fastify";
import { HealthController } from "../controllers/HealthController.js";
import { GameAppDependencies } from "../types.js";

export const healthRoutes: FastifyPluginAsync<GameAppDependencies> = async (app, opts) => {
	// Crear el controller con Redis client
	const controller = new HealthController(opts.redisClient, opts.eventSubscriber);

	/**
	 * Health check endpoint
	 */
	app.get('/health', async (request, reply) => {
		return controller.handleHealthCheck(request, reply);
	});
};
