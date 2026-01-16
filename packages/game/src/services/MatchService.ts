import { randomUUID } from 'node:crypto';
import { MatchRepository } from '../repositories/MatchRepository.js';
import { MatchMapper } from '../mappers/MatchMapper.js';
import { redisClient } from '../app.js'; 
import { MatchTypes, MatchSchemas, SharedErrors } from '@transcendence/shared';


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
     * 
     * 
     * 
     * 
     */
	async joinPublicQueue(userId: string): Promise<MatchTypes.JoinQueueResponse> {

		// GUARD: Validación crítica de infraestructura
        if (!redisClient) {
            throw new SharedErrors.ServiceError('redis', 'Redis client not available');
		}
		
		// 1. Validaciones previas (igual que antes)
		const activeMatch = await this.matchRepo.findActiveMatchByUserId(userId);
		if (activeMatch) throw new SharedErrors.ConflictError('User already has an active match');

		const QUEUE_KEY = 'match:queue:public';
		const TICKET_TIMESTAMP = Date.now();

		// 2. Intentar sacar al usuario más antiguo (ZPOPMIN es atómico)
		// Devuelve [userId, score, userId, score...] pero como pedimos 1, devuelve [id, score]
		const result = await redisClient.zpopmin(QUEUE_KEY, 1);

		// Parsear resultado de Redis (puede venir null o array vacío dependiendo del driver)
		const opponentId = (result && result.length > 0) ? result[0] : null;

		// CASO A: Encontramos oponente
		if (opponentId && opponentId !== userId) {
			
			// Creamos la partida (El servicio es dueño del ID)
			const newMatch: MatchTypes.MatchRow = {
				id: randomUUID(),
				status: 'active',
				player1_id: opponentId, // El que tenía el ticket más viejo va primero
				player1_score: 0,
				player2_id: userId,     // Nosotros llegamos ahora
				player2_score: 0,
				winner_id: null,
				created_at: Date.now(),
				finished_at: null,
				game_mode: 'classic',
				target_score: 11
			};

			// Persistencia Bubble-Up
			await this.matchRepo.create(newMatch);

			// Notificar match...
			
			return { 
				outcome: 'match_found', 
				match: MatchMapper.toDomain(newMatch) 
			};
		
		} else {
			// CASO B: Nadie esperando. Nos metemos a la cola con nuestro TICKET.
			
			// Edge case: Si nos sacamos a nosotros mismos (race condition rara), nos ignoramos
			if (opponentId === userId) {
			// log warning
			}

			// ZADD: Añade al set. 
			// Score = TICKET_TIMESTAMP (para ordenar por tiempo).
			// Member = userId.
			await redisClient.zadd(QUEUE_KEY, TICKET_TIMESTAMP, userId);
			
			return { outcome: 'added_to_queue' };
		}
	}

	/**
	 * Método extra necesario para tu gestión de Timeouts/Cancelación
	 * Esto permite al usuario decir "me cansé de esperar, sácame".
	 */
	async leavePublicQueue(userId: string): Promise<void> {
		if (!redisClient) return;

		const QUEUE_KEY = 'match:queue:public';
		// ZREM es O(1) en complejidad. Con Listas esto era O(N).
		await redisClient.zrem(QUEUE_KEY, userId);
	}
	
	
	/**
     * createPrivateMatch
     * Crea una partida directamente entre dos usuarios conocidos.
     */
	async createPrivateMatch(
		userId: string,
		opponentId: string,
		config?: Partial<MatchSchemas.CreateMatchBodyType>): Promise<MatchTypes.Match> {
		
		//Guard
		if (!redisClient) {
			throw new SharedErrors.ServiceError('redis', 'Redis client not available');
		}

        // 1. Validaciones de Negocio
        if (userId === opponentId) {
            throw new SharedErrors.ConflictError('No puedes desafiarte a ti mismo');
        }

        const activeMatch = await this.matchRepo.findActiveMatchByUserId(userId);
        if (activeMatch) throw new SharedErrors.ConflictError('You are already in an active match');
        
        const activeMatchOpponent = await this.matchRepo.findActiveMatchByUserId(opponentId);
        if (activeMatchOpponent) throw new SharedErrors.ConflictError('Opponent is already in an active match');
        
        // 2. Construcción de la Entidad (El Servicio decide ID y Estado)
        const newMatch: MatchTypes.MatchRow = {
            id: randomUUID(),           // ID generado en lógica de negocio
            status: 'pending',          // Nace pendiente de aceptación
            player1_id: userId,
            player1_score: 0,
            player2_id: opponentId,
            player2_score: 0,
            winner_id: null,
            created_at: Date.now(),
            finished_at: null,
            game_mode: config?.gameMode || 'classic',
            target_score: config?.targetScore || 11
        };

        // 3. Persistencia (Bubble Up de errores SQL)
        await this.matchRepo.create(newMatch); // Usamos el create genérico

        try {
            // 4. Mapeo e Hidratación
            let matchDomain = MatchMapper.toDomain(newMatch);
            matchDomain = await this.hydrateMatchPlayers(matchDomain);
                
            // 5. Notificar invitación
            await redisClient.publish('game_events', JSON.stringify({
                type: 'match.invite',
                targetUserId: opponentId,
                payload: matchDomain
            }));

            return matchDomain;

        } catch (error) {
            console.error(`🔥 [Critical] Fallo post-creación. ROLLBACK.`, error);
            
            // ROLLBACK: Borramos la partida física si falló la notificación
            await this.matchRepo.delete(newMatch.id);
            throw new SharedErrors.ServiceError('redis','Error iniciando partida privada.');
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
		//Guard: Infraestructura
		if (!redisClient) {
            throw new SharedErrors.ServiceError('redis', 'Redis client not available');
		}
		
        // 1. Obtener la partida cruda (Row)
        const matchRow = await this.matchRepo.findById(matchId); 

        // 2. Guards
        if (!matchRow) throw new SharedErrors.NotFoundError('Match not found');
        if (matchRow.status !== 'pending') throw new SharedErrors.ValidationError('Match is not pending');
        if (matchRow.player2_id !== userId) throw new SharedErrors.ForbiddenError('You are not the invited player');

        // 3. Actualizar estado en DB
        await this.matchRepo.updateStatus(matchId, 'active');

		try {
			// 4. Hidratación y Mapeo
			// Convertimos el Row crudo a Objeto de Dominio
			let matchDomain = MatchMapper.toDomain(matchRow);
			
			// Forzamos el estado a 'active' en el objeto en memoria porque toDomain usa el dato viejo
			matchDomain.status = 'active';
			
			// Rellenamos los nombres de usuario (S2S)
			matchDomain = await this.hydrateMatchPlayers(matchDomain);

			// 5. Notificar inicio de partida (Redis)
			await redisClient.publish('game_events', JSON.stringify({
				type: 'match.started',
				payload: matchDomain
			}));

			return matchDomain;
		} catch (error) {
			console.error(`🔥 [Critical] Fallo al iniciar partida. ROLLBACK a PENDING.`, error);
    
			// COMPENSACIÓN: Revertir estado si falla la notificación/hidratación
            // Si falló el inicio, devolvemos la invitación a "pendiente" para que puedan reintentar.
            await this.matchRepo.updateStatus(matchId, 'pending');

            throw new SharedErrors.ServiceError('game', 'Error al iniciar la partida. Por favor intenta aceptar de nuevo.');
		}
	}
	
	/**
     * rejecttMatch
     * Rechaza una partida privada, cambia su estado y notifica.
     */
	async rejectMatch(userId: string, matchId: string): Promise<MatchTypes.Match> {
		// Guard: Infraestructura
        if (!redisClient) throw new SharedErrors.ServiceError('redis', 'Redis not available');
		
		// 1. Obtener la partida cruda (Row)
		const matchRow = await this.matchRepo.findById(matchId);

		// 2. Guards
		if (!matchRow) throw new SharedErrors.NotFoundError('Match not found');
		if (matchRow.status !== 'pending') throw new SharedErrors.ValidationError('Match is not pending');
		if (matchRow.player2_id !== userId) throw new SharedErrors.ForbiddenError('Only the invited player can reject');

		// 3. Actualizar estado en DB
		await this.matchRepo.updateStatus(matchId, 'rejected');

		try {

			// 4. Hidratación y Mapeo
			// Convertimos el Row crudo a Objeto de Dominio
			let matchDomain = MatchMapper.toDomain(matchRow);
			
			matchDomain.status = 'rejected'; // Actualizacion manual en memoria
			matchDomain = await this.hydrateMatchPlayers(matchDomain);

			// 5. Notificar rechazo (Redis)
			await redisClient.publish('game_events', JSON.stringify({
				type: 'match.rejected',
				payload: matchDomain
			}));

			return matchDomain;
		} catch (error) {
			console.error(`🔥 [Critical] Fallo post-rechazo.`, error);
			// En rechazo, el rollback es menos crítico, pero idealmente revertimos
            await this.matchRepo.updateStatus(matchId, 'pending');
            throw new SharedErrors.ServiceError('game', 'Error rejecting match.');
		}
    }

	/**
     * cancelPrivateMatch
     * Permite al creador (P1) revocar la invitación antes de que sea aceptada.
     */
	async cancelPrivateMatch(userId: string, matchId: string): Promise<void> {
		// Guard
        if (!redisClient) throw new SharedErrors.ServiceError('redis', 'Redis not available');
		
        console.log(`👉 ⚙️ [Service] Cancelando invitación ${matchId} por usuario ${userId}`);

        // 1. Obtener la partida
        const matchRow = await this.matchRepo.findById(matchId);

        // 2. Guards (Validaciones)
        if (!matchRow) throw new SharedErrors.NotFoundError('Match not found');
        // Solo se puede cancelar si no ha empezado
        if (matchRow.status !== 'pending') {
            throw new SharedErrors.ValidationError('Cannot cancel a match that is not pending');
        }
        // SEGURIDAD: Solo el creador (Player 1) puede cancelar SU invitación
        if (matchRow.player1_id !== userId) {
            throw new SharedErrors.ForbiddenError('You are not the creator of this match');
        }

        // 3. Borrar de la DB (Hard Delete porque nunca ocurrió)
        // Al borrarla, liberamos a ambos usuarios del bloqueo de "Active Match".
        await this.matchRepo.delete(matchId);

        // 4. Notificar al invitado (Player 2)
        // Es importante para que su interfaz se limpie si tenía el popup abierto.
        await redisClient.publish('game_events', JSON.stringify({
            type: 'match.cancelled', 
            targetUserId: matchRow.player2_id, // Avisamos al invitado para que cierre el popup
            payload: { matchId }
        }));
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
