import { FastifyRequest, FastifyReply } from 'fastify';
import { MatchService } from '../services/MatchService.js';
// Importamos el Schema (Valor) Y el Tipo
import { MatchSchemas, MatchTypes, SharedErrors } from '@transcendence/shared';


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
    // MÉTODO CREATE MATCH (Refactorizado)
    // ========================================================================
    /**
     * createMatch
     * Ahora es puramente un adaptador HTTP.
     * Recibe la petición -> Llama al orquestador del servicio -> Devuelve respuesta.
     */
    async createMatch(
        request: FastifyRequest<{ Body: MatchSchemas.CreateMatchBodyType }>,
        reply: FastifyReply
    ) {
        console.log("[MATCH-CTRL] New request: createMatch");

        // 1. AUTENTICACIÓN
        const user = request.user!;
        
        try {
            // 2. LLAMADA AL SERVICIO (Una sola línea maestra)
            // Ya no nos importa si es pública, privada o local. El servicio se encarga.
            const result = await this.matchService.handleCreateMatch(user.id, request.body);

            // 3. RESPUESTA HTTP
            console.log("[MATCH-CTRL] Service response successful.");

            // Decisión de Código HTTP (Responsabilidad de la capa de Transporte)
            // Si nos unimos a cola (esperando) -> 200 OK
            // Si se creó una partida (recurso creado) -> 201 Created
            if ('outcome' in result && result.outcome === 'added_to_queue') {
                return reply.status(200).send(result);
            }
            
            // Para 'match_found', 'local' o 'private' -> 201
            return reply.status(201).send(result);

        } catch (error) {
            // El servicio lanza errores (Validation, Conflict, etc), aquí los capturamos
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
		console.log("[MATCH-CTRL] acceptMatch");

		// 1. EXTRAE DATOS Y VALIDA JWT 
		// Extrae matchId de req.params
		const { id } = req.params;
		// Extrae userId de req.user
        const user = req.user!;

		console.log(`[MATCH-CTRL] User ${user.id} attempting to accept match ${id}`);
        
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
		console.log("[MATCH-CTRL] rejectMatch");

		// 1. EXTRAE DATOS Y VALIDA JWT 
		// Extrae matchId de req.params
		const { id } = req.params;
		// Extrae userId de req.user
		const user = req.user!;

		console.log(`[MATCH-CTRL] User ${user.id} attempting to reject match ${id}`);
        
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
        // 1. CONFIANZA EN EL MIDDLEWARE
        // Usamos '!' (Non-null assertion) porque el middleware garantiza que user existe.
        // Esto elimina el código defensivo sucio.
        const user = req.user!; 
        const matchId = req.params.id;
        
        try {
            // 2. LLAMADA AL SERVICIO
            await this.matchService.cancelPrivateMatch(user.id, matchId);
            
            // 3. RESPUESTA ESTANDARIZADA
            const response: MatchTypes.CancelMatchResponse = {
                success: true,
                message: 'Invitation cancelled successfully'
            };
            return reply.status(200).send(response);
            
        } catch (error) {
            // 4. MANEJO DE ERRORES CENTRALIZADO
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
        console.log("[MATCH-CTRL] leaveQueue");

        // 1. AUTENTICACIÓN
        const user = req.user!;
        console.log(`[MATCH-CTRL] User ${user.id} leaving public queue`);

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
            console.error("[MATCH-CTRL] Error in leaveQueue:", error);
            SharedErrors.handleError(error, reply);
        }
	}


    async getMatchHistory(req: FastifyRequest<MatchSchemas.GetMatchHistoryReq>, reply: FastifyReply) {
        // 1. Extraer Params (userId)
        const { userId } = req.params;
        
        // 2. Extraer Query (offset). Si es undefined, el servicio o schema maneja el default.
        const { offset } = req.query;

		try {
			// 3. Llamar al servicio (si offset viene undefined, enviamos 0 al servicio)
			const matches = await this.matchService.getMatchHistory(userId, offset ?? 0);
			
			// 4. Responder
			return reply.send(matches);
		} catch(err) {
			SharedErrors.handleError(err, reply);
		}
    }
}
