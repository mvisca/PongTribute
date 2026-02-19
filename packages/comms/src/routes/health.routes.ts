import { FastifyPluginAsync } from "fastify";
import { CommsController } from "../controllers/comms.controller.js";
import { CommsAppDependencies } from "../app.js";

export const healthRoutes: FastifyPluginAsync<CommsAppDependencies> = async (app, opts) => {
	// Crear el controller con el servicio inyectado y su Redis client
	const controller = new CommsController(opts.commsService, opts.commsService.getRedisClient());

	/**
	 * Health check endpoint
	 */
	app.get('/health', async (request, reply) => {
		return controller.handleHealthCheck(request, reply);
	});
};
