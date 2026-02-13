import { FastifyPluginAsync } from "fastify";
import { CommsService } from "../services/comms.service.js";
import { CommsController } from "../controllers/comms.controller.js";
import { CommsMiddleware } from "../middlewares/auth.middleware.js";

export const wsRoutes: FastifyPluginAsync = async (app) => {
	// Obtener la instancia del servicio desde global
	const service = (global as any).commsService as CommsService;

	if (!service) {
		throw new Error('[CommsRoutes] CommsService not initialized');
	}

	// Crear el controller con el servicio
	const controller = new CommsController(service);

	// @fastify/websocket: websocket:true activa el upgrade HTTP→WS.
	// En rutas HTTP normales no se necesita porque el default es false.
	// El handler WS recibe (socket, request) en vez de (request, reply)
	// porque no hay respuesta HTTP — la comunicación es bidireccional vía socket.
	app.get('/comms/ws', { 
		websocket: true,
		preHandler: [CommsMiddleware.validateJWT]
	}, 
	(socket, request) => {
		controller.handleWebSocketConnection(socket, request);
	}
	);
}