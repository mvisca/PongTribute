import { FastifyPluginAsync } from "fastify";
import type { Redis } from "ioredis";
import { CommsService } from "../services/comms.service.js";
import { CommsController } from "../controllers/comms.controller.js";

export const healthRoutes: FastifyPluginAsync<{ redisClient: Redis | null }> = async (app, opts) => {
	// Obtener la instancia del servicio desde global
	const service = (global as any).commsService as CommsService;

	if (!service) {
		throw new Error('[HealthRoutes] CommsService not initialized');
	}

	// Crear el controller con el servicio y Redis client
	const controller = new CommsController(service, opts.redisClient);

	/**
	 * Health check endpoint
	 */
	app.get('/health', async (request, reply) => {
		return controller.handleHealthCheck(request, reply);
	});
};
