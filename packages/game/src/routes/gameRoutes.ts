import { FastifyPluginAsync } from 'fastify';
import { MatchController } from '../controllers/MatchController.js';
import { AuthMiddleware, MatchSchemas } from '@transcendence/shared';

export const gameRoutes: FastifyPluginAsync = async (app) => {
    // Instanciamos el controlador una sola vez
    const controller = new MatchController();

    // ========================================================================
    // RUTAS DE PARTIDAS (MATCHES)
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
        schema: MatchSchemas.CreateMatchEndpoint,

        // 3. EJECUTOR Manejador: Llamamos al método del controlller
        // Usamos .bind() para no perder el contexto 'this' dentro del controller
        handler: controller.createMatch.bind(controller)
    });

    // Aquí irían más rutas:
    // app.get('/matches/:id', ...);
};