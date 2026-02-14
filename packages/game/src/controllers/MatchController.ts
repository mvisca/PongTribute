import { FastifyRequest, FastifyReply } from 'fastify';
import { MatchService } from '../services/MatchService.js';
// Importamos el Schema (Valor) Y el Tipo
import { MatchSchemas, AuthTypes, MatchTypes, SharedErrors, GameMode } from '@transcendence/shared';


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

	// ========================================================================
	// MÉTODO CREATE MATCH (Discrimina entre partida 'private' o 'public')
	// ========================================================================
	/**
	 * createMatch
	 * Orquesta la creación de partidas (privada) o la unión a colas de espera (publica).
	 * * Flujo de decisión:
	 * 1. Si es PUBLIC: Llama a joinPublicQueue (Redis/Memoria).
	 * 2. Si es PRIVATE: Llama a createPrivateMatch (Base de Datos).
	 */
	async createMatch(
		request: FastifyRequest<{ Body: MatchSchemas.CreateMatchBodyType }>,
		reply: FastifyReply
	) {
		console.log("\n--- NEW REQUEST (SECURE) ---");
		console.log("[Controller] 1. Entrando en createMatch");

		// 1. AUTENTICACIÓN
        // El casting es seguro porque el middleware 'validateJWT' ya se ejecutó.
		const user = request.user as AuthTypes.AccessTokenPayload;
		console.log(`[Controller] User Authenticated: ${user.id}`);
		
		// 2. EXTRACCION DE DATOS
		const { matchType, opponentId, gameMode } = request.body;

		// 3. VALIDACIÓN DE ENTRADA (Verifica coherencia basica)
		if (matchType === 'private' && !opponentId) {
			console.log("❌ [Controller] Error: Private match sin opponentId");
			return reply.status(400).send({
				error: 'Bad Request',
				message: 'Private match requires an opponentId'
			});
		}

		// 4. LÓGICA Y DELEGACIÓN
		try {
			let result;

			if (matchType === 'public') {
				// RAMA PÚBLICA: Gestión de Colas (Matchmaking)
				console.log("[Controller] 4. Llamando a Service.joinPublicQueue...");
				// El Schema asegura que gameMode es un string válido del Enum
				result = await this.matchService.joinPublicQueue(user.id, gameMode as GameMode);

			} else if (matchType === 'local') { 
                
                console.log("[Controller] 4. Creando partida LOCAL (Ephemeral)...");
                // Pasamos la config opcional (targetScore, etc) si existiera en el body
                const config = request.body; 
                result = await this.matchService.createLocalMatch(user.id, config);
                
				return reply.status(201).send(result);
				
			} else {
				// RAMA PRIVADA: Creación Directa (Desafío)
				console.log("[Controller] 4. Llamando a Service.createPrivateMatch...");
				// El opponentId! es seguro aquí por la validación del paso 3
				result = await this.matchService.createPrivateMatch(user.id, opponentId!);
			}
			
			// 5. RESPUESTA EXITOSA
			console.log("[Controller] 5. Respuesta recibida del servicio:", JSON.stringify(result).substring(0, 50) + "...");

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
			SharedErrors.handleError(error, reply);
		}
	}


	// ========================================================================
	// MÉTODO ACCEPT MATCH
	// ========================================================================
	
	async acceptMatch(
		//Le dice a Fastify (y a TypeScript) que req.params tendrá la forma { id: string } definida en Shared
		req: FastifyRequest<{ Params: MatchTypes.AcceptMatchParams }>,
		reply: FastifyReply
	) {
		console.log("[Controller] Entrando en acceptMatch");

		// 1. EXTRAE DATOS Y VALIDA JWT 
		// Extrae matchId de req.params
		const { id } = req.params;
		// Extrae userId de req.user
        const user = req.user as AuthTypes.AccessTokenPayload;

		console.log(`User ${user.id} attempting to accept match ${id}`);
        
		try {

			// 2. Llama a MatchService para VALIDAR si existe, si es 'pending', 
			// si soy el invitado y entonces lo pone en 'active'
			const match = await this.matchService.acceptMatch(user.id, id);

			// 3. Respuesta Exitosa
			// Devolvemos el objeto Match actualizado (status: 'active')
			// El frontend usara esto para redirigir a la pantalla de juego
			return reply.status(200).send(match);

		} catch (error) {
			SharedErrors.handleError(error, reply);
		}
	}
	
	// ========================================================================
	// MÉTODO REJECT MATCH
	// ========================================================================
	
	//Rechaza invitacion a partida privada
	async rejectMatch(
		//Le dice a Fastify (y a TypeScript) que req.params tendrá la forma { id: string } definida en Shared
		req: FastifyRequest<{ Params: MatchTypes.RejectMatchParams }>,
		reply: FastifyReply
	) {
		console.log("[Controller] Entrando en rejectMatch");

		// 1. EXTRAE DATOS Y VALIDA JWT 
		// Extrae matchId de req.params
		const { id } = req.params;
		// Extrae userId de req.user
		const user = req.user as AuthTypes.AccessTokenPayload;

		console.log(`User ${user.id} attempting to reject match ${id}`);
        
		try {

			// 2. Llama a MatchService para VALIDAR si existe, si es 'pending', 
			// si soy el invitado y entonces lo pone en 'active'
			const match = await this.matchService.rejectMatch(user.id, id);

			// 3. Respuesta Exitosa
			// Devolvemos el objeto Match actualizado (status: 'reject')
			// El frontend usara esto para devolvernos a la pantalla principal
			return reply.status(200).send(match);

		} catch (error) {
			SharedErrors.handleError(error, reply);
		}
	}
	
	/**
     * cancelMatch
     * Permite al creador cancelar una invitación pendiente.
     */
    async cancelMatch(
        req: FastifyRequest<{ Params: MatchTypes.CancelMatchParams }>,
        reply: FastifyReply
    ) {
        const userId = req.user?.id;
        const matchId = req.params.id;

        if (!userId) {
            return reply.status(401).send({ message: 'Unauthorized' });
        }

		try {
			// Delegamos al servicio (que ya tiene la lógica de guards)
			await this.matchService.cancelPrivateMatch(userId, matchId);

			
			// Retornamos estructura definida en Schema
			const response: MatchTypes.CancelMatchResponse = {
				success: true,
				message: 'Invitation cancelled successfully'
			};
			return reply.status(200).send(response);
			
		} catch (error) {
			SharedErrors.handleError(error, reply);
		}
    }

    /**
     * leaveQueue
     * Saca al usuario autenticado de la cola de espera pública (Redis).
     */
    public leaveQueue = async (
        req: FastifyRequest, // No necesitamos Generics de Params aquí, porque no hay variables dinamicas en la URL
        reply: FastifyReply
    ) => {
        console.log("[Controller] Entrando en leaveQueue");

        // 1. AUTENTICACIÓN
        const user = req.user as AuthTypes.AccessTokenPayload;
        console.log(`User ${user.id} leaving public queue`);

        try {
            // 2. LLAMADA AL SERVICIO
            // Solo pasamos el userId. El servicio sabe en qué key de Redis buscar.
            await this.matchService.leavePublicQueue(user.id);

            // 3. RESPUESTA EXITOSA
			// Construimos la respuesta EXACTA que pide el LeaveQueueResponseSchema.
			// Retorna objeto plano JSON. Fastify lo serializa y valida contra el 
			// Schema que esta en la ruta.
            return reply.status(200).send({
                success: true,
                message: 'Successfully removed from queue'
            });

        } catch (error) {
            console.error("❌ [Controller] Error in leaveQueue:", error);
            SharedErrors.handleError(error, reply);
        }
	}


    async getMatchHistory(req: FastifyRequest<MatchSchemas.GetMatchHistoryReq>, reply: FastifyReply) {
        // 1. Extraer Params (userId)
        const { userId } = req.params;
        
        // 2. Extraer Query (offset). Si es undefined, el servicio o schema maneja el default.
        const { offset } = req.query;

        // 3. Llamar al servicio (si offset viene undefined, enviamos 0 al servicio)
        const matches = await this.matchService.getMatchHistory(userId, offset ?? 0);
        
        // 4. Responder
        return reply.send(matches);
    }
}
