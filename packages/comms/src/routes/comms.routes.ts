import { FastifyPluginAsync } from "fastify";
import { CommsController } from "../controllers/comms.controller.js";
import { CommsMiddleware } from "../middlewares/auth.middleware.js";
import { CommsAppDependencies } from "../app.js";

export const wsRoutes: FastifyPluginAsync<CommsAppDependencies> = async (app, opts) => {
	// Crear el controller con el servicio inyectado
	const controller = new CommsController(opts.commsService);

	// @fastify/websocket: websocket:true activa el upgrade HTTP→WS.
	// En rutas HTTP normales no se necesita porque el default es false.
	// El handler WS recibe (socket, request) en vez de (request, reply)
	// porque no hay respuesta HTTP — la comunicación es bidireccional vía socket.
	app.get('/comms/ws', {
		websocket: true,
		preHandler: [CommsMiddleware.validateJWT(opts.commsService.getRedisClient())]
	},
	(socket, request) => {
		controller.handleWebSocketConnection(socket, request);
	}
	);
}