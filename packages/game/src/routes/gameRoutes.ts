import { FastifyPluginAsync } from 'fastify';
import { MatchController } from '../controllers/MatchController.js';
import { GameGateway } from '../gateways/GameGateway.js';
import { GameService } from '../services/GameService.js';
import { MatchRepository } from '../repositories/MatchRepository.js';
import { MatchSchemas, MatchTypes } from '@transcendence/shared';
import { GameMiddleware } from '../middleware/game.middleware.js';
import { MatchService } from '../services/MatchService.js';

export const gameRoutes: FastifyPluginAsync = async (app) => {

	// ========================================================================
    // 1. INYECCIÓN DE DEPENDENCIAS (COMPOSITION ROOT)
    // ========================================================================
    // Centralizamos la creación de instancias aquí para facilitar el testing.
	// Si quisiéramos testear, podríamos pasar Repositorios "Mock" (falsos).

	const matchRepo = new MatchRepository();
	// Service para la lógica de tiempo real (Game Loop, Física)
	const gameService = new GameService(matchRepo); // Inyectamos Repo en Servicio
	// Service para la lógica administrativa (Crear partida en DB, Historial)
	// Instanciamos el servicio UNA VEZ (Singleton por ámbito)
    // Este servicio manejará tanto DB (privadas) como Redis (públicas)
	const matchService = new MatchService(matchRepo);
	// Inicializamos los manejadores de tráfico (pasamos las instancias a los consumidores)
    const controller = new MatchController(matchService);
    const gateway = new GameGateway(gameService);   // Inyectamos Servicio game en Gateway

    // ========================================================================
    // 2. RUTA HTTP DE CREAR PARTIDA (REST)
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
    // 3. RUTA HTTP DE ACEPTAR PARTIDA (REST)
    // ========================================================================
	
	//id:/accept: Los dos puntos indican a Fastify que esa parte de la URL es 
	// una variable. Fastify la extraerá automáticamente y la pondrá en req.params.id
	app.post<{ Params: MatchTypes.AcceptMatchParams }>('/matches/id:/accept', {
        preHandler: [GameMiddleware.validateJWT],
        schema: MatchSchemas.AcceptMatchSchema,
        handler: controller.acceptMatch.bind(controller)
    });

	// ========================================================================
    // 4. RUTAS WEBSOCKET: CONEXIÓN REAL-TIME
	// ========================================================================

	/**
     * GET /game/ws
     * Endpoint de actualización a protocolo WebSocket.
     * * Flujo:
     * 1. Handshake: El cliente solicita upgrade HTTP -> WS.
     * 2. Fastify (websocket: true): Intercepta y expone el objeto 'connection'.
     * 3. Gateway: Valida el ticket de conexión y gestiona los eventos del socket.
     */
    // Ruta final: /api/game/ws  (El prefijo /api viene de app.ts)
	app.get('/game/ws', { websocket: true }, (connection, req) => {
        gateway.handleConnection(connection, req);
    });
    
	console.log('✅ Game Routes registered');
};

