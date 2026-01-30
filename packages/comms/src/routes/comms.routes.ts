import { FastifyPluginAsync } from "fastify";
import { CommsService } from "../services/comms.service.js";
import { CommsController } from "../controllers/comms.controller.js";

export const wsRoutes: FastifyPluginAsync = async (app) => {
	// Obtener la instancia del servicio desde global
	const service = (global as any).commsService as CommsService;

	if (!service) {
		throw new Error('[CommsRoutes] CommsService not initialized');
	}

	// Crear el controller con el servicio
	const controller = new CommsController(service);

	/**
	 * WebSocket endpoint para comunicaciones en tiempo real
	 */
	app.get('/ws', { websocket: true }, (socket, request) => {
		controller.handleWebSocketConnection(socket, request);
	});
}