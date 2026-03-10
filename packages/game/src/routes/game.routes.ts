import { FastifyPluginAsync } from 'fastify';
import { MatchController } from '../controllers/MatchController.js';
import { GameGateway } from '../gateways/GameGateway.js';
import { MatchSchemas, MatchTypes } from '@transcendence/shared';
import { GameMiddleware } from '../middleware/game.middleware.js';
import { GameAppDependencies } from '../types.js';

export const gameRoutes: FastifyPluginAsync<GameAppDependencies> = async (app, opts) => {

	const { matchService, gameService } = opts;

	// ========================================================================
	// CONTROLADORES Y GATEWAYS (Capa de Transporte)
	// ========================================================================
	const controller = new MatchController(matchService);
	const gateway = new GameGateway(gameService);

	// ========================================================================
	// RUTA HTTP DE CREAR PARTIDA (REST)
	// ========================================================================
	/**
	 * POST /matches
	 * Crea una nueva partida en la base de datos y devuelve su ID.
	 * Flujo:
	 * 1. Middleware: Valida JWT (Authentication).
	 * 2. Schema: Valida que el body cumpla CreateMatchSchema (Validation).
	 * 3. Controller: Orquesta la creación y responde al cliente.
	 */
	app.post<{ Body: MatchSchemas.CreateMatchBodyType }>('/matches', {
		preHandler: [GameMiddleware.validateJWT],
		schema: MatchSchemas.CreateMatchSchema,
		handler: controller.createMatch.bind(controller)
	});

	// ========================================================================
	// RUTA HTTP DE CANCELAR PARTIDA PUBLICA EN ESPERA (REST)
	// ========================================================================
	/**
	 * DELETE /matches/queue
	 * Saca al usuario de la cola de matchmaking.
	 */
	app.delete('/matches/queue', {
		preHandler: [GameMiddleware.validateJWT],
		schema: MatchSchemas.LeaveQueueSchema,
		handler: controller.leaveQueue.bind(controller)
	});

	// ========================================================================
	// RUTA HTTP DE ACEPTAR INVITACION DE PARTIDA (REST)
	// ========================================================================
	app.post<{ Params: MatchTypes.AcceptMatchParams }>('/matches/:id/accept', {
		preHandler: [GameMiddleware.validateJWT],
		schema: MatchSchemas.AcceptMatchSchema,
		handler: controller.acceptMatch.bind(controller)
	});

	// ========================================================================
	// RUTA HTTP DE RECHAZAR INVITACION PARTIDA (REST)
	// ========================================================================
	app.post<{ Params: MatchTypes.RejectMatchParams }>('/matches/:id/reject', {
		preHandler: [GameMiddleware.validateJWT],
		schema: MatchSchemas.RejectMatchSchema,
		handler: controller.rejectMatch.bind(controller)
	});

	// ========================================================================
	// RUTA HTTP DE CANCELAR LA INVITACION A PARTIDA (REST) Creador
	// ========================================================================
	/**
	 * DELETE /matches/:id
	 * Permite al creador (Player 1) cancelar una invitación pendiente.
	 */
	app.delete<{ Params: MatchTypes.CancelMatchParams }>('/matches/:id', {
		preHandler: [GameMiddleware.validateJWT],
		schema: MatchSchemas.CancelMatchSchema,
		handler: controller.cancelMatch.bind(controller)
	});

	// ========================================================================
	// RUTA HTTP QUE OBTIENE EL HISTORIAL DE PARTIDAS DE UN USER (REST)
	// ========================================================================
	/**
	 * GET /matches/history/:userId
	 * Obtiene un array de partidas de un usuario.
	 */
	app.get<MatchSchemas.GetMatchHistoryReq>('/matches/history/:userId', {
			preHandler: [GameMiddleware.validateJWT],
			schema: MatchSchemas.GetMatchHistorySchema,
			handler: controller.getMatchHistory.bind(controller)
	});

	// ========================================================================
	// WEBSOCKETS: CONEXIÓN REAL-TIME
	// ========================================================================
	/**
	 * GET /game/ws
	 * Endpoint de actualización a protocolo WebSocket.
	 * Flujo:
	 * 1. Handshake: El cliente solicita upgrade HTTP -> WS.
	 * 2. Fastify (websocket: true): Intercepta y expone el objeto 'connection'.
	 * 3. Gateway: Valida el ticket de conexión y gestiona los eventos del socket.
	 */
	app.get('/game/ws', { websocket: true }, (connection, req) => {
		gateway.handleConnection(connection, req);
	});

	app.log.info('Game routes registered');
};
