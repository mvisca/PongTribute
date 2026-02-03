import { FastifyPluginAsync } from "fastify";
import { HealthController } from "../controllers/health.controller.js";

export const healthRoutes: FastifyPluginAsync = async (app) => {
	// Crear el controller
	const controller = new HealthController();

	/**
	 * Health check endpoint
	 */
	app.get('/health', async (request, reply) => {
		return controller.handleHealthCheck(request, reply);
	});
};
