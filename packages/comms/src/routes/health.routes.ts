import { FastifyPluginAsync } from "fastify";
import { CommsService } from "../services/comms.service.js";
import { CommsController } from "../controllers/comms.controller.js";

export const healthRoutes: FastifyPluginAsync = async (app) => {
	// Obtener la instancia del servicio desde global
	const service = (global as any).commsService as CommsService;

	if (!service) {
		throw new Error('[HealthRoutes] CommsService not initialized');
	}

	// Crear el controller con el servicio y su Redis client
	const controller = new CommsController(service, service.getRedisClient());

	/**
	 * Health check endpoint
	 */
	app.get('/health', async (request, reply) => {
		return controller.handleHealthCheck(request, reply);
	});
};
