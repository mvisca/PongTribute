import { FastifyPluginAsync } from 'fastify';
import { MatchController } from '../controllers/MatchController.js';
import { AuthMiddleware } from '../middleware/auth.middleware.js';
import { GameGateway } from '../gateways/GameGateway.js';
import { MatchSchemas } from '@transcendence/shared';

export const gameRoutes: FastifyPluginAsync = async (app) => {
    // Instanciamos el controlador una sola vez
	const controller = new MatchController();
	const gateway = new GameGateway();

    // ========================================================================
    // HTTP: RUTAS DE CREAR PARTIDA (REST)
    // ========================================================================
	
	// si viene una request de tipo POST para la ruta /matches:
	app.post('/matches', {
        // 1. GUARDIAN Seguridad: Ejecutamos el middleware antes que nada
		// Esto valida el Token JWT y rellena request.user
		// Es el guardián. Si el usuario no envía un Header Authorization:
		//  Bearer <token> válido, la petición se muere aquí y devuelve 401.
		//  El Controller ni se entera. Esto mantiene tu código seguro y limpio.
        preHandler: [AuthMiddleware.validateJWT],

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

// import { FastifyInstance } from 'fastify';
// import { MatchController } from '../controllers/MatchController.js';
// import { AuthMiddleware } from '../middleware/auth.middleware.js'; // IMPORT LOCAL
// import { MatchSchemas } from '@transcendence/shared';

// export async function gameRoutes(fastify: FastifyInstance) {
//     fastify.post('/matches', {
//         preHandler: [AuthMiddleware.validateJWT], // Usamos el local
//         schema: MatchSchemas.CreateMatchSchema,   // CORREGIDO: Usar .CreateMatchSchema, no .CreateMatchEndpoint
//         handler: MatchController.createMatch
//     });
// }

// /* EXPLICACIÓN:
// 1. Import AuthMiddleware local: Ya no busca en @transcendence/shared, eliminando el error TS2305.
// 2. MatchSchemas.CreateMatchSchema: Corregimos el nombre de la propiedad para coincidir con lo definido en shared.
// */
