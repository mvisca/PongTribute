import { MatchRepository } from '../repositories/MatchRepository.js';
import { MatchMapper } from '../mappers/MatchMapper.js';
import { redisClient } from '../app.js'; 
import { MatchTypes } from '@transcendence/shared';


// Definimos el tipo de retorno para la cola pública
export type JoinQueueResponse = 
    | { outcome: 'match_found'; match: MatchTypes.Match }
    | { outcome: 'added_to_queue' };


/**
 * MatchService
 * Gestiona la lógica de negocio para la creación y orquestación de partidas.
 * Actúa como nexo entre la volatilidad de Redis (Matchmaking) y la persistencia de SQL (Historial).
 */
export class MatchService {
    private matchRepo: MatchRepository;

	// INYECCIÓN DE DEPENDENCIA
    constructor(matchRepo: MatchRepository) { // Recibe la instancia, no la crea.
        this.matchRepo = matchRepo;
    }

	/**
     * joinPublicQueue
     * Algoritmo de Matchmaking simple (FIFO).
     * 1. Intenta sacar un oponente de la cola (LPOP).
     * 2. Si encuentra uno válido: Crea la partida en DB y notifica.
     * 3. Si no: Se añade a la cola (RPUSH) y espera.
     */
    async joinPublicQueue(userId: string): Promise<JoinQueueResponse> {
        // Validación de seguridad por si el servidor arrancó mal
        if (!redisClient) throw new Error('Redis client not initialized');

		const QUEUE_KEY = 'match:queue:public';
		
		console.log(`👉 ⚙️ [Service] Revisando cola Redis (${QUEUE_KEY})...`);

        // 1. Intentamos sacar un oponente de la cola (Operación Atómica)
        const opponentId = await redisClient.lpop(QUEUE_KEY);

		// --- MATCH ENCONTRADO ---
		if (opponentId && opponentId !== userId) {
			console.log(`👉 ⚙️ [Service] ¡Oponente encontrado! (${opponentId}) vs Yo (${userId})`);

            // a. Persistir en DB (El oponente es P1 porque estaba esperando, yo soy P2)(Estado: ACTIVE)
            const matchRow = await this.matchRepo.createPublicMatch(opponentId, userId);

            // b. Mapear a Objeto de Dominio e hidratar nombres(S2S Call)
            let matchDomain = MatchMapper.toDomain(matchRow);
            matchDomain = await this.hydrateMatchPlayers(matchDomain);

			// c. Notificar evento 'match.found'
            // El Gateway lo interceptará para avisar a los clientes que se conecten al juego
            await redisClient.publish('game_events', JSON.stringify({
                type: 'match.found',
                payload: {
                    matchId: matchDomain.id,
                    opponentId: userId, // ID de quien disparó el evento (yo)
                    match: matchDomain
                }
            }));

            // d. Retornar al Controller
            return { outcome: 'match_found', match: matchDomain };

		} else {
			
            // --- AÑADIR A LA COLA ---
			console.log("👉 ⚙️ [Service] Cola vacía o soy yo mismo. Añadiéndome a la cola...");
			
            // Si por error me saqué a mí mismo, me ignoro.
            if (opponentId === userId) {
				// log de warning opcional
				console.warn("⚠️ ⚙️ [Service] Warning: Me saqué a mí mismo de la cola. Reinsertando.");
            }

			// Me pongo al final de la fila
            await redisClient.rpush(QUEUE_KEY, userId);
            return { outcome: 'added_to_queue' };
        }
    }

	/**
     * createPrivateMatch
     * Crea una partida directamente entre dos usuarios conocidos.
     */
    async createPrivateMatch(userId: string, opponentId: string): Promise<MatchTypes.Match> {
        if (!redisClient) throw new Error('Redis client not initialized');

		console.log(`👉 ⚙️ [Service] Creando partida privada: ${userId} vs ${opponentId}`);

        if (userId === opponentId) {
            throw new Error("No puedes desafiarte a ti mismo");
        }

        // 1. Crear en DB (Status PENDING)
        const matchRow = await this.matchRepo.createPrivateMatch(userId, opponentId);

        // 2. Mapear e Hidratar
		let matchDomain = MatchMapper.toDomain(matchRow);
        matchDomain = await this.hydrateMatchPlayers(matchDomain);
			
        // 3. Notificar invitación via Redis
        await redisClient.publish('game_events', JSON.stringify({
            type: 'match.invite',
            targetUserId: opponentId,
            payload: matchDomain
        }));

        return matchDomain;
	}

	// ========================================================================
    // MÉTODOS PRIVADOS (HELPERS)
    // ========================================================================

    /**
     * hydrateMatchPlayers
     * Rellena los usernames de los jugadores consultando al User Service.
     * Usa Promise.all para hacer las peticiones en paralelo (Performance).
     */
    private async hydrateMatchPlayers(match: MatchTypes.Match): Promise<MatchTypes.Match> {
        console.log("👉 ⚙️ [Service] Hidratando nombres...");
        
        // Ejecutamos las peticiones HTTP simultáneamente
        const [p1Data, p2Data] = await Promise.all([
            this.fetchUserProfile(match.player1.userId),
            match.player2 ? this.fetchUserProfile(match.player2.userId) : Promise.resolve({ username: 'Waiting...' })
        ]);

        // Asignamos los resultados
        match.player1.username = p1Data.username;
        if (match.player2) {
            match.player2.username = p2Data.username;
        }
        return match;
	}
	
	/**
     * fetchUserProfile
     * Helper para la comunicación S2S (Service-to-Service)
	 * (pide al modulo user por HTTP el username del userId)
	*/
	private async fetchUserProfile(userId: string): Promise<{ username: string }> {
		// 1. Obtener URL Base
		const baseUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
		
		// Usamos la ruta interna, no la pública (/api)
		// Esta ruta interna esta protegida por el SERVICE_SECRET en lugar del JWT
		const targetUrl = `${baseUrl}/internal/users/by-id/${userId}`;
		
		try {
			const response = await fetch(targetUrl, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					'x-service-secret': process.env.SERVICE_SECRET || ''
				}
			});
			
			// 3. Manejo de errores HTTP
			if (!response.ok) {
				console.warn(`   ⚠️ [Hydration] User Service respondió ${response.status} para ${userId}`);
				return { username: 'Unknown' };
			}
			
			// 4. Parsear respuesta
			const userData = await response.json() as { username: string };
			return { username: userData.username };
			
		} catch (error) {
			console.error(`   🔥 [Hydration] Error de conexión con ${baseUrl}:`, error);
			return { username: 'Unknown' };
		}
	}
}
