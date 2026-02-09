import { FastifyPluginAsync } from "fastify";
import { CommsService } from "../services/comms.service.js";
import { CommsController } from "../controllers/comms.controller.js";
import { CommsMiddleware } from "src/middlewares/auth.middleware.js";

export const wsRoutes: FastifyPluginAsync = async (app) => {
	// Obtener la instancia del servicio desde global
	const service = (global as any).commsService as CommsService;

	if (!service) {
		throw new Error('[CommsRoutes] CommsService not initialized');
	}

	// Crear el controller con el servicio
	const controller = new CommsController(service);

	/** WebSocket endpoint para comunicaciones en tiempo real */
	app.get('/comms/ws', { 
			websocket: true, // Por default es false y por default endpoint o api es true? por que en endpoint no pongo nada y aquí sí? que otras opciones similares hay?
			preHandler: [CommsMiddleware.validateJWT]
		}, 
		(socket, request) => { // TODO por qué una función aquí y no el estilo como en los otros endpoints donde se pone controller: o handler:
			controller.handleWebSocketConnection(socket, request);
		} // TODO por qué socker request y no request reply? socket es de tipy FastifySocket o similar?
	);
}