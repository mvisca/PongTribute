import { FastifyRequest, FastifyReply } from 'fastify';
import { MatchService } from '../services/MatchService.js';
// Importamos el Schema (Valor) Y el Tipo
import { MatchSchemas, AuthTypes } from '@transcendence/shared';


/**
 * MatchController
 * Se encarga de recibir las peticiones HTTP relacionadas con la gestión de partidas.
 * Actúa como "semáforo", validando la entrada y decidiendo a qué método del servicio llamar.
 */
export class MatchController {

	// Propiedad privada para almacenar el servicio inyectado
	private matchService: MatchService;

	// INYECCIÓN DE DEPENDENCIA: Recibimos el servicio ya montado.
	// Recibimos la instancia del servicio desde gameRoutes.
    // Esto permite que el Controller sea agnóstico de cómo se construye el servicio.
    constructor(matchService: MatchService) {
        this.matchService = matchService;
    }

	/*===== HANDLER(discrimina entre partida 'private' o 'public') ====*/
	/**
     * createMatch
     * Orquesta la creación de partidas o la unión a colas de espera.
     * * Flujo de decisión:
     * 1. Si es PUBLIC: Llama a joinPublicQueue (Redis/Memoria).
     * 2. Si es PRIVATE: Llama a createPrivateMatch (Base de Datos).
     */
	async createMatch(
		//Usamos Generics aquí para que request.body ya tenga el tipo correcto
        // sin necesidad de hacer 'as ...' dentro.
        request: FastifyRequest<{ Body: MatchSchemas.CreateMatchBodyType }>,
        reply: FastifyReply
	) {
		console.log("\n--- NEW REQUEST (SECURE) ---");
		console.log("👉 🎮 [Controller] 1. Entrando en createMatch");

		// 1. AUTENTICACIÓN
        // El casting es seguro porque el middleware 'validateJWT' ya se ejecutó.
		const user = request.user as AuthTypes.JWTPayload;
		console.log(`👉 🎮 [Controller] User Authenticated: ${user.id}`);
		
		// 2. EXTRACCION DE DATOS
		const { matchType, opponentId } = request.body;

		// 3. VALIDACIÓN DE ENTRADA (Validación de Negocio Superficial)
        // Verificamos coherencia básica antes de molestar al servicio.
		if (matchType === 'private' && !opponentId) {
			console.log("❌ 🎮 [Controller] Error: Private match sin opponentId");
			return reply.status(400).send({ 
				error: 'Bad Request', 
				message: 'Private match requires an opponentId' 
			});
		}

		// 4. LÓGICA Y DELEGACIÓN (Envuelto en TRY-CATCH)
		try {
			let result;

			if (matchType === 'public') {
				// RAMA PÚBLICA: Gestión de Colas (Matchmaking)
				console.log("👉 🎮 [Controller] 4. Llamando a Service.joinPublicQueue...");
				result = await this.matchService.joinPublicQueue(user.id);
			} else {
				// RAMA PRIVADA: Creación Directa (Desafío)
				console.log("👉 🎮 [Controller] 4. Llamando a Service.createPrivateMatch...");
				// El opponentId! es seguro aquí por la validación del paso 3
				result = await this.matchService.createPrivateMatch(user.id, opponentId!);
			}
			
			// 5. RESPUESTA EXITOSA
			console.log("👉 🎮 [Controller] 5. Respuesta recibida del servicio:", JSON.stringify(result).substring(0, 50) + "...");

			// Distinguimos códigos HTTP según lo que pasó:
			if ('outcome' in result) {
				// Caso A: Se añadió a la cola pero no hay partida aún -> 200 OK
				if (result.outcome === 'added_to_queue') {
					return reply.status(200).send(result);
				}
				// Caso B: Se encontró partida inmediatamente -> 201 Created
				if (result.outcome === 'match_found') {
					return reply.status(201).send(result.match);
				}
			} else {
				// Caso C: Partida privada creada -> 201 Created
				return reply.status(201).send(result);
			}

			// Fallback por si acaso (defensivo)
			return reply.status(500).send({ error: 'Unexpected state' });

		} catch (error) {
			// 6. MANEJO DE ERRORES DE NEGOCIO
			// Transformamos errores de lógica (throw Error) en respuestas HTTP coherentes.
			// Convertir excepciones de código (throw new Error) en códigos HTTP (400, 404, 500)
			//  es responsabilidad EXCLUSIVA del controlador. El Servicio nunca debe retornar un 
			// HTTP status, solo datos o errores.
			console.error("❌ 🎮 [Controller] Error capturado:", error);

			if (error instanceof Error) {
				// 400 Bad Request: Errores imputables al usuario (ej: retarse a sí mismo)
				if (error.message.includes('ti mismo')) {
					return reply.status(400).send({
						error: 'Bad Request',
						message: error.message
					});
				}
				// 404 Error: Usuario no encontrado (Not Found) - Útil para cuando consultamos User Service
				if (error.message.includes('not found')) {
					return reply.status(404).send({
						error: 'Not Found',
						message: error.message
					});
				}
			}

			// 500 Internal Server Error: Algo se rompió en el servidor
			return reply.status(500).send({
				error: 'Internal Server Error',
				message: 'An internal error occurred processing the match'
			});
		}
	}
}