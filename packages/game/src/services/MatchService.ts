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

	//  VALIDA QUE USER NO ESTA YA EN UNA PARTIDA ACTIVA PREVIA
		const activeMatch = await this.matchRepo.findActiveMatchByUserId(userId);
		if (activeMatch) {
			throw new Error('You are already in an active match');
		}

		const QUEUE_KEY = 'match:queue:public';
		const TICKET_PREFIX = 'match:ticket:'; // Prefijo para controlar validez
		
		console.log(`👉 ⚙️ [Service] Revisando cola Redis (${QUEUE_KEY})...`);

		
		// =====================================================================
        // PATRÓN: LOOP DE BÚSQUEDA Y LIMPIEZA DE LA COLA(LAZY EXPIRATION)
		// =====================================================================
		// Creamos un ticket de 120 seg para cada usuario que se mete en la cola.
		// Al ir a buscar oponente en la cola comprueba que el ticket de 120 seg este
		// vigente y hace el MATCH, sino lo descarta y da una vuelta mas al bucle
		//para ver si el siguiente de la fila es valido.
		
        let opponentId: string | null = null;
        let foundValidOpponent = false;

        // Intentamos sacar gente de la cola hasta encontrar uno VÁLIDO o vaciarla
        while (!foundValidOpponent) {
            opponentId = await redisClient.lpop(QUEUE_KEY);

            // Si la cola está vacía, terminamos el loop
            if (!opponentId) break;

            // Si me encuentro a mí mismo (caso borde), me ignoro y sigo
            if (opponentId === userId) continue;

            // VERIFICACIÓN DE TICKET (¿Sigue esperando este usuario?)
            const isTicketValid = await redisClient.exists(`${TICKET_PREFIX}${opponentId}`);
            
            if (isTicketValid) {
                // ¡Encontramos uno vivo!
                foundValidOpponent = true;
            } else {
                // El usuario caducó (su ticket expiró). 
                // Al hacer LPOP ya lo sacamos de la lista, así que simplemente
                // logueamos y el loop continuará con el siguiente.
                console.log(`🧹 [Cleaner] Usuario ${opponentId} descartado por timeout.`);
            }
        }

        // --- MATCH ENCONTRADO ---
        if (foundValidOpponent && opponentId) {
            console.log(`👉 ⚙️ [Service] ¡Match! (${opponentId}) vs (${userId})`);

			try {
				// 1. Persistir en DB (P1: Opponent, P2: Me)
				// Si falla, aun no hemos borrado tickets ni notificado.
				const matchRow = await this.matchRepo.createPublicMatch(opponentId, userId);

				// 2. Quemar tickets (Commit en Redis)
            	// Solo llegamos aquí si la DB confirmó la creación.
				await redisClient.del(`${TICKET_PREFIX}${opponentId}`);
				await redisClient.del(`${TICKET_PREFIX}${userId}`);

				// 3. Hidratacion y mapeo
				let matchDomain = MatchMapper.toDomain(matchRow);
				matchDomain = await this.hydrateMatchPlayers(matchDomain);

				// 4. Notificar Evento
				await redisClient.publish('game_events', JSON.stringify({
					type: 'match.found',
					payload: {
						matchId: matchDomain.id,
						opponentId: userId,
						match: matchDomain
					}
				}));

					return { outcome: 'match_found', match: matchDomain };

			} catch (error) {
				console.error(`🔥 [Critical] Fallo al consolidar Match. ROLLBACK EJECUTADO.`, error);
    
				// 🚨 ROLLBACK DE REDIS (LA CLAVE DE LA ATOMICIDAD) 🚨
				// Devolvemos al oponente al INICIO de la cola (LPUSH, no RPUSH) para que sea el siguiente en ser atendido.
				// Esto evita la pérdida de datos (Data Loss) del LPOP anterior.
				await redisClient.lpush(QUEUE_KEY, opponentId);

				// Nota: No necesitamos restaurar el Ticket porque nunca lo borramos (la línea del 'del' está dentro del try).
				
				// Si el error fue DESPUÉS de crear la fila en DB (ej: en la hidratación), deberíamos borrarla también.
				// Pero como createPublicMatch es lo primero, generalmente el fallo estará allí.
				
				throw new Error('Error interno al crear la partida. Inténtalo de nuevo.');
			}

        } else {
            // --- AÑADIR A LA COLA ---
            console.log("👉 ⚙️ [Service] Nadie válido en cola. Entrando a esperar...");

            // 1. Crear el Ticket de validez (TTL 120 segundos)
            // Si esto desaparece, el usuario se considera "fuera de la cola"
            await redisClient.set(`${TICKET_PREFIX}${userId}`, 'valid', 'EX', 120);

            // 2. Entrar a la lista física
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

		//OJO: EL OPONENT SOLO SERA INVITABLE A TRAVES DE LA VENTANITA FRIENDS,
		// por tanto no se si tiene mucho sentido verificar de nuevo aqui???

		//  VALIDA QUE NINGUNO DE LOS 2 NO ESTÉ YA EN UNA PARTIDA ACTIVA PREVIA
		const activeMatch = await this.matchRepo.findActiveMatchByUserId(userId);
		if (activeMatch) {
			throw new Error('You are already in an active match');
		}
		const activeMatchOpponent = await this.matchRepo.findActiveMatchByUserId(opponentId);
		if (activeMatchOpponent) {
			throw new Error('Your opponent is already in an active match');
		}
		
        // 1. Crear en DB (Status PENDING)
        const matchRow = await this.matchRepo.createPrivateMatch(userId, opponentId);

		try {
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
		} catch (error) {
			console.error(`🔥 [Critical] Fallo post-creación de partida. HACIENDO ROLLBACK.`, error);
    
			// 🚨 COMPENSACIÓN / ROLLBACK 🚨
			// Como falló la notificación o la hidratación, borramos la partida de la DB
			// para que los usuarios no se queden "atrapados" en una partida fantasma.
			await this.matchRepo.delete(matchRow.id);

			// Opcional: Devolver los tickets a Redis o simplemente lanzar error para que reintenten
			throw new Error('Error de sistema al iniciar partida. Por favor intenta de nuevo.');
		}
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

		try {
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
		} catch (error) {
			console.error(`🔥 [Critical] Fallo al iniciar partida. ROLLBACK a PENDING.`, error);
    
			// 🚨 MEJORA: REVERTIR ESTADO EN LUGAR DE BORRAR 🚨
            // Si falló el inicio, devolvemos la invitación a "pendiente" para que puedan reintentar.
            await this.matchRepo.updateStatus(matchId, 'pending');

            throw new Error('Error al iniciar la partida. Por favor intenta aceptar de nuevo.');
		}
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

		try {

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
		} catch (error) {
			console.error(`🔥 [Critical] Fallo post-creación de partida. HACIENDO ROLLBACK.`, error);
    
			// 🚨 COMPENSACIÓN / ROLLBACK 🚨
			// Como falló la notificación o la hidratación, borramos la partida de la DB
			// para que los usuarios no se queden "atrapados" en una partida fantasma.
			await this.matchRepo.delete(matchRow.id);

			// Opcional: Devolver los tickets a Redis o simplemente lanzar error para que reintenten
			throw new Error('Error de sistema al iniciar partida. Por favor intenta de nuevo.');
		}
    }


	/**
     * fetchUserProfile
     * Helper para la comunicación S2S (Service-to-Service)
	 * (pide al modulo User por HTTP el username del userId)
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
