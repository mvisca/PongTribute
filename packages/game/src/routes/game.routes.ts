// Actúa como COMPOSITION ROOT (instancia Repo, Service, Redis). 
// Aquí es donde deben vivir los Cron Jobs y el Health Check para 
// compartir la misma instancia de servicios y base de datos.

import { FastifyPluginAsync } from 'fastify';
import { MatchController } from '../controllers/MatchController.js';
import { GameGateway } from '../gateways/GameGateway.js';
import { GameService } from '../services/GameService.js';
import { MatchRepository } from '../repositories/MatchRepository.js';
import { MatchSchemas, MatchTypes, Utils } from '@transcendence/shared';
import { GameMiddleware } from '../middleware/game.middleware.js';
import { MatchService } from '../services/MatchService.js';
import { MatchEventSubscriber } from '../subscribers/MatchEventSubscriber.js';
import { GameEnv } from '../config.js';
import { healthRoutes } from './health.routes.js';
import { getDatabase } from '../connection.js';

export const gameRoutes: FastifyPluginAsync = async (app) => {

	// ========================================================================
    // INFRAESTRUCTURA (Redis & DB)
    // ========================================================================
    // Creamos la conexión a Redis usando la configuración del entorno.
    const redisConfig = GameEnv.getRedisConfig();
    const redisClient = Utils.createRedisClient(redisConfig);

	// ========================================================================
    // INYECCIÓN DE DEPENDENCIAS (COMPOSITION ROOT)
    // ========================================================================
    // Centralizamos la creación de instancias aquí para facilitar el testing.
	// Si quisiéramos testear, podríamos pasar Repositorios "Mock" (falsos).

	// 1. Obtener la instancia de DB primero (asegurando orden de ejecución)
	const db = getDatabase();
	// Repositorio
	const matchRepo = new MatchRepository(db);

	// Servicio de Matchmaking (Lógica de negocio + Redis + SQL)
    // Inyectamos repo y redisClient
	const matchService = new MatchService(matchRepo, redisClient);

	// Servicio de Juego (Game Loop / Físicas)
	const gameService = new GameService(matchRepo, redisClient);

	// Controladores y Gateways (Capa de Transporte)
    const controller = new MatchController(matchService);
	const gateway = new GameGateway(gameService);
	

	// LIMPIEZA DE ZOMBIES (Al arrancar)
    console.log('[GAME-ROUTES] Checking for zombie matches on startup...');
    matchRepo.resetZombieMatches()
        .then(count => {
            if (count > 0) console.log(`[GAME-ROUTES] Aborted ${count} orphan zombie matches.`);
            else console.log('[GAME-ROUTES] Database clean: no zombie matches found.');
        })
        .catch(err => console.error('[GAME-ROUTES] Error cleaning zombie matches:', err));
	

	// ========================================================================
	// 3. CRON JOBS
	// ========================================================================
    // Al estar aquí, comparte el mismo redisClient y matchService que la API
    console.log('[GAME-ROUTES] Starting internal cron jobs');
    const cronInterval = setInterval(() => {
        matchService.pruneQueues().catch(err => app.log.error(err));
        matchService.prunePrivateInvites().catch(err => app.log.error(err));
    }, 10000);

	// ========================================================================
    // SUSCRIPTORES (Background Tasks)
    // ========================================================================
    // Le pasamos el matchService para que pueda usarlo
    const eventSubscriber = new MatchEventSubscriber(matchService, gameService);
    await eventSubscriber.connect();

	// ========================================================================
	// 5. REGISTRO HEALTH CHECK
	// ========================================================================
    // Pasamos el cliente redis para que el endpoint /health verifique la conexión real
    await app.register(healthRoutes, { redisClient });


    // ========================================================================
    // RUTA HTTP DE CREAR PARTIDA (REST)
    // ========================================================================
	/**
     * POST /matches
     * Crea una nueva partida en la base de datos y devuelve su ID.
     * * Flujo:
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
		// 1. Guard: Solo usuarios logueados pueden estar en cola
		preHandler: [GameMiddleware.validateJWT],
		schema: {
			tags: ['Game'],
			description: 'Cancela la espera a una partida publica',
			// Vinculo el Schema de Respuesta que cree en Shared
			response: {
				200: MatchSchemas.LeaveQueueResponseSchema
			}
		},
		// 2. Vinculo al controller
		handler: controller.leaveQueue.bind(controller)
	});

   // ========================================================================
    // RUTA HTTP DE ACEPTAR INVITACION DE PARTIDA (REST)
    // ========================================================================
	// Permite aceptar la invitacion a una partida (privada)
	//id:/accept: Los dos puntos indican a Fastify que esa parte de la URL es 
	// una variable. Fastify la extraerá automáticamente y la pondrá en req.params.id
	app.post<{ Params: MatchTypes.AcceptMatchParams }>('/matches/:id/accept', {
        preHandler: [GameMiddleware.validateJWT],
        schema: MatchSchemas.AcceptMatchSchema,
        handler: controller.acceptMatch.bind(controller)
    });

	// ========================================================================
    // RUTA HTTP DE RECHAZAR INVITACION PARTIDA (REST)
	// ========================================================================
	// Permite rechazar la invitacion a una partida (privada)
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
     * Si la partida ya empezó o no es el creador, devuelve error.
     */
    app.delete<{ Params: MatchTypes.CancelMatchParams }>('/matches/:id', {
        // 1. Auth: Aseguramos que sabemos quién es el usuario (req.user)
        preHandler: [GameMiddleware.validateJWT],
        // 2. Schema: Validamos que el ID sea UUID y documentamos respuestas (Swagger)
        schema: MatchSchemas.CancelMatchSchema,
        // 3. Handler: Delegamos al controlador manteniendo el contexto 'this'
        handler: controller.cancelMatch.bind(controller)
    });

	// ========================================================================
    // RUTA HTTP QUE OBTIENE EL HISTORIAL DE PARTIDAS DE UN USER (REST)
    // ========================================================================
    /**
     * GET /matches/history/userId
     * Obtiene un array de partidas de un usuario
     */
	app.get<MatchSchemas.GetMatchHistoryReq>(
    '/matches/history/:userId',
    {
        preHandler: [GameMiddleware.validateJWT],
        schema: MatchSchemas.GetMatchHistorySchema,
        handler: controller.getMatchHistory.bind(controller)
    });

	// ========================================================================
    // WEBSOCKETS: CONEXIÓN REAL-TIME
	// ========================================================================

	/**
     * GET /game/ws
	 * Permite a Cliente abrir un websocket a Game unicamente para jugar la partida
     * Endpoint de actualización a protocolo WebSocket.
     * * Flujo:
     * 1. Handshake: El cliente solicita upgrade HTTP -> WS.
     * 2. Fastify (websocket: true): Intercepta y expone el objeto 'connection'.
     * 3. Gateway: Valida el ticket de conexión y gestiona los eventos del socket.
     */
	app.get('/game/ws', { websocket: true }, (connection, req) => {
        gateway.handleConnection(connection, req);
    });
    
	console.log('[GAME-ROUTES] Game routes registered');

	// ========================================================================
	// 7. LIFECYCLE (Limpieza)
	// ========================================================================
    app.addHook('onClose', async () => {
        console.log('[GAME-ROUTES] Cleaning up resources...');
		clearInterval(cronInterval); // Paramos el cron
		// Cierra el subscriber (que tiene su propia conexión Redis)
		await eventSubscriber.disconnect();
        await redisClient.quit();    // Cerramos Redis
    });
};

