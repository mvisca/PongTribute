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

	// ✓ VALIDA QUE USER NO ESTA YA EN UNA PARTIDA PREVIA
		const activeMatch = await this.matchRepo.findActiveMatchByUserId(userId);
		if (activeMatch) {
			throw new Error('You are already in an active match');
		}


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

			// c. Notificar evento 'match.found' via REDIS (Pub/Subs)
			// El Gateway lo interceptará para avisar a los 2 clientes que se conecten al juego
			//=======TODO: OJO envolver en try-catch para evitar crash si REDIS cae
			// no estoy seguro si eso lo cubre la 1a linea de este metodo ??????
			// JOAN: SIN ENVOLVER TODOS LOS redisClient.publish() EN try-catch
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
			//Defino timeout para la cola: si en 2 minutos nadie lo encuentra, sale automaticamente
			await redisClient.expire(`match:queue:user:${userId}`, 300);

			//TODO: Implementar cron job que limpie la cola cada 10 minutos
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

		//=======TODO: EL OPONENT SOLO SERA INVITABLE A TRAVES DE LA VENTANITA FRIENDS,
		// SI NO ESTA YA DENTRO DE UNA PARTIDA ACTIVA

		
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
     * acceptMatch
     * Confirma una partida privada, cambia su estado y notifica.
     */
    async acceptMatch(userId: string, matchId: string): Promise<MatchTypes.Match> {
        // 1. Obtener la partida cruda (Row)
        const matchRow = await this.matchRepo.findById(matchId); 

        // 2. Guards
        if (!matchRow) throw new Error('Match not found');
        if (matchRow.status !== 'pending') throw new Error('Match is not pending');
        if (matchRow.player2_id !== userId) throw new Error('You are not the invited player');

        // 3. Actualizar estado en DB
        await this.matchRepo.updateStatus(matchId, 'active');

        // 4. Hidratación y Mapeo (CRÍTICO para devolver el tipo correcto)
        // Convertimos el Row crudo a Objeto de Dominio
        let matchDomain = MatchMapper.toDomain(matchRow);
        
        // Actualizamos el estado manualmente en el objeto de dominio para devolverlo actualizado
        // (Ya que toDomain usó el row viejo que decía 'pending' y vive en la memoria RAM. En la DB 
		// ya lo hemos actualizado)
        matchDomain.status = 'active'; 

        // Rellenamos los nombres de usuario (S2S)
        matchDomain = await this.hydrateMatchPlayers(matchDomain);

        // 5. Notificar inicio de partida (Redis)
        await redisClient?.publish('game_events', JSON.stringify({
            type: 'match.started',
            payload: matchDomain
        }));

        return matchDomain;
	}
	
	/**
     * acceptMatch
     * Rechaza una partida privada, cambia su estado y notifica.
     */
    async rejectMatch(userId: string, matchId: string): Promise<MatchTypes.Match> {
        // 1. Obtener la partida cruda (Row)
        const matchRow = await this.matchRepo.findById(matchId); 

        // 2. Guards
        if (!matchRow) throw new Error('Match not found');
        if (matchRow.status !== 'pending') throw new Error('Match is not pending');
        if (matchRow.player2_id !== userId) throw new Error('Only the invited player can reject');

        // 3. Actualizar estado en DB
        await this.matchRepo.updateStatus(matchId, 'rejected');

        // 4. Hidratación y Mapeo (CRÍTICO para devolver el tipo correcto)
        // Convertimos el Row crudo a Objeto de Dominio
        let matchDomain = MatchMapper.toDomain(matchRow);
        
        // Actualizamos el estado manualmente en el objeto de dominio para devolverlo actualizado
        // (Ya que toDomain usó el row viejo que decía 'pending' y vive en la memoria RAM. En la DB 
		// ya lo hemos actualizado)
        matchDomain.status = 'rejected'; 

        // Rellenamos los nombres de usuario (S2S)
        matchDomain = await this.hydrateMatchPlayers(matchDomain);

        // 5. Notificar inicio de partida (Redis)
        await redisClient?.publish('game_events', JSON.stringify({
            type: 'match.rejected',
            payload: matchDomain
        }));

        return matchDomain;
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
