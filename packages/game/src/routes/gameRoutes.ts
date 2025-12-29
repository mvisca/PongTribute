
import { FastifyPluginAsync } from 'fastify';
import { MatchController } from '../controllers/MatchController.js';
import { GameGateway } from '../gateways/GameGateway.js';
import { GameService } from '../services/GameService.js';
import { MatchRepository } from '../repositories/MatchRepository.js';
import { MatchSchemas } from '@transcendence/shared';
import { GameMiddleware } from '../middleware/game.middleware.js';

export const gameRoutes: FastifyPluginAsync = async (app) => {

    // 1. Instanciar capas en orden (Dependency Injection manual)
    const matchRepo = new MatchRepository();
    const gameService = new GameService(matchRepo); // Inyectamos Repo en Servicio
    const gateway = new GameGateway(gameService);   // Inyectamos Servicio en Gateway
    
    // El controller también podría necesitar el servicio, pero por ahora lo instancia dentro.
    // Lo ideal sería: const controller = new MatchController(gameService);
    // Pero el controller actual usa 'MatchService' (para matchmaking), no 'GameService' (para playing).
    // Lo mantengo separado, por ahora.
    const controller = new MatchController();

    // ========================================================================
    // HTTP: RUTAS DE CREAR PARTIDA (REST)
    // ========================================================================
	
	// si viene una request de tipo POST para la ruta /matches:
	// Esto conecta el tipado de la ruta con lo que espera el controlador.
    app.post<{ Body: MatchSchemas.CreateMatchBodyType }>('/matches', {
        // 1. GUARDIAN Seguridad: Ejecutamos el middleware antes que nada
		// Esto valida el Token JWT y rellena request.user
		// Es el guardián. Si el usuario no envía un Header Authorization:
		//  Bearer <token> válido, la petición se muere aquí y devuelve 401.
		//  El Controller ni se entera. Esto mantiene tu código seguro y limpio.
        preHandler: [GameMiddleware.validateJWT],

        // 2. VALIDADOR Contrato: Usamos el Schema "Endpoint-Centric" que creamos
		// Fastify validará automáticamente el body y la respuesta.
		//Si el usuario envía basura en el JSON, Fastify devuelve 
		// 400 Bad Request automáticamente.
        schema: MatchSchemas.CreateMatchSchema,

        // 3. EJECUTOR Manejador: Llamamos al método del controlller
        // Usamos .bind() para no perder el contexto 'this' dentro del controller
        handler: controller.createMatch.bind(controller)
    });

	// ========================================================================
    // WEBSOCKET: CONEXIÓN REAL-TIME
	// ========================================================================
	// 	app.get: Los WebSockets siempre empiezan como una petición GET normal
	//  antes de "transformarse".
	// { websocket: true }: Esta es la opción mágica de fastify-websocket.
	// Le dice al router: "Espera un Handshake, no una petición normal".
	// (connection, req): Al activar el modo websocket, los argumentos cambian.
	// Ya no recibes (request, reply).
	// Recibes (connection, request). El objeto connection contiene el socket real.
	// gateway.handleConnection: Pasamos la pelota al Gateway que creaste antes.
	//  Él validará el token de la URL y aceptará o cerrará el socket.
	
    // Ruta final: /api/game/ws  (El prefijo /api viene de app.ts)
	app.get('/game/ws', { websocket: true }, (connection, req) => {
        // Delegamos todo el trabajo sucio al Gateway
        gateway.handleConnection(connection, req);
    });
    
};

