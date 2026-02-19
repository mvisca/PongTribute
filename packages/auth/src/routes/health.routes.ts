import { FastifyPluginAsync } from "fastify";
import { AuthController } from "../controllers/auth.controller.js";
import { AuthAppDependencies } from "../app.js";

export const healthRoutes: FastifyPluginAsync<AuthAppDependencies> = async (app, opts) => {
	// Crear el controller con Redis client
	const controller = new AuthController(opts.redisClient);

	/**
	 * Health check endpoint
	 */
	app.get('/health', async (request, reply) => {
		return controller.handleHealthCheck(request, reply);
	});
};
