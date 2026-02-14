import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import { MatchRepository } from '../repositories/MatchRepository.js';
import { MatchMapper } from '../mappers/MatchMapper.js';
import {
	MatchTypes,
	MatchSchemas,
	SharedErrors,
	GameMode,
	MatchConstants,
	REDIS_CHANNELS,
	MatchFoundEvent,
	MatchInviteEvent,
	MatchStartedEvent,
	MatchRejectedEvent,
	MatchCancelledEvent,
	MatchQueueTimeoutEvent
} from '@transcendence/shared';


/**
 * MatchService
 * Gestiona la lógica de negocio para la creación y orquestación de partidas.
 */
export class MatchService {
	private matchRepo: MatchRepository;
	private redis: Redis;

	// INYECCIÓN DE DEPENDENCIA
	// El servicio NO se preocupa de dónde viene Redis, solo pide una instancia.
    constructor(matchRepo: MatchRepository, redisClient: Redis) { // Recibe la instancia, no la crea.
		this.matchRepo = matchRepo;
		this.redis = redisClient;
    }

	/**
     * joinPublicQueue
     * 
     * Mecanismo: Cola FIFO con Compensación de Errores y utilizando Redis Sorted Sets (`match:queue:$gameMode`).
	 * Atomicidad: Se utiliza `ZPOPMIN` para obtener usuarios de las colas de 
	 * forma atómica.
     * Acepta 'gameMode' para separar las colas.
     * 
     */
	async joinPublicQueue(userId: string, gameMode: GameMode): Promise<MatchTypes.JoinQueueResponse> {

		// Guard: Usuario no en partida activa?
		const activeMatch = await this.matchRepo.findActiveMatchByUserId(userId);
		if (activeMatch) throw new SharedErrors.ConflictError('User already has an active match');

		const QUEUE_KEY = `match:queue:${gameMode}`;
		const TICKET_TIMESTAMP = Date.now();

		console.log(`🔍 User ${userId} joining queue: ${QUEUE_KEY}`);

		// ATOMIC POP Intento sacar de la cola al usuario más antiguo (ID y SCORE/Timestamp)
		// zpopmin devuelve [id, score, id, score ...]
		const result = await this.redis.zpopmin(QUEUE_KEY, 1);
		//const opponentId = (result && result.length > 0) ? result[0] : null;

		// Verificamos si obtuvimos algo
        if (!result || result.length === 0) {
             // NADIE EN COLA: Me añado yo y termino.
             await this.redis.zadd(QUEUE_KEY, TICKET_TIMESTAMP, userId);
             return { outcome: 'added_to_queue' };
		}
		
		const opponentId = result[0];
		const opponentScore = result[1]; // <--- Guardamos su antigüedad
		
		// CASO BORDE: Me saqué a mi mismo (poco probable pero posible por latencia)
        if (opponentId === userId) {
             await this.redis.zadd(QUEUE_KEY, opponentScore, opponentId);
             return { outcome: 'added_to_queue' };
		}
		
		// INTENTO DE MATCH (Bloque Seguro)
        try {
            // Fetch de datos
            const [p1Data, p2Data] = await Promise.all([
                this.fetchUserProfile(opponentId),
                this.fetchUserProfile(userId)
            ]);

            const newMatch: MatchTypes.MatchRow = {
                id: randomUUID(),
                status: 'active',
                player1_id: opponentId,
                player1_username: p1Data.username,
                player1_score: 0,
                player2_id: userId,
                player2_username: p2Data.username,
                player2_score: 0,
                winner_id: null,
                created_at: Date.now(),
                finished_at: null,
                game_mode: gameMode,
                target_score: 11
            };

			// PERSISTENCIA
			await this.matchRepo.create(newMatch);

			// Mapeo
            const matchDomain = MatchMapper.toDomain(newMatch);
			
			// Notificar al oponente vía Redis Pub/Sub (match_found vs mi_username)			
			// Defino el evento con tipado estricto. Si falta 'timestamp' o 'payload' está mal, falla.
			const event: MatchFoundEvent = {
				type: REDIS_CHANNELS.MATCH_FOUND, // Usa la constante ('match:found')
				timestamp: Date.now(),
				source: 'game-service', // Opcional, pero útil para debugar
				payload: {  // al definir este obj, TypeScrpit busca las variables en el ambito local.
					matchId: matchDomain.id,     // Mapea los datos de tu dominio
					playerIds: [opponentId, userId],
					roomId: matchDomain.id
				}
			};

			// Publicamos en el CANAL de eventos (definido en shared)
			await this.redis.publish(REDIS_CHANNELS.EVENTS, JSON.stringify(event));

            return { outcome: 'match_found', match: matchDomain };
		
			// 
			} catch (error) {
            console.error(`🔥 [CRITICAL] Error creando Match. Restaurando a ${opponentId} en cola.`, error);
            
            // COMPENSACIÓN (Rescate)
            // Devolvemos al oponente a la cola con su antigüedad original
            // TypeScript puede quejarse de que opponentScore es string, forzamos casteo si hace falta
            await this.redis.zadd(QUEUE_KEY, opponentScore, opponentId);
            
            // Re-lanzamos el error para que el Controller avise al usuario actual
            throw error;
        }
	}

	/**
     * Elimina usuarios que llevan más de 90 seg esperando en cola y les avisa.
     * Cron Job: Se ejecuta cada 10 segundos desde server.ts
     */
	async pruneQueues(): Promise<void> {
		
		const timeoutMs = MatchConstants.QUEUE_TIMEOUT_MS;
        const limit = Date.now() - timeoutMs;

        for (const mode of Object.values(GameMode)) {
            const queueKey = `match:queue:${mode}`;

            // 1. FETCH: Obtenemos candidatos
            const expiredUserIds = await this.redis.zrangebyscore(queueKey, '-inf', limit);

            // 2. PROCESS: Iteramos uno a uno para evitar Race Conditions
            for (const userId of expiredUserIds) {
                // Intentamos borrar. ZREM devuelve el número de elementos borrados.
                // Si devuelve 1, fuimos nosotros. Si devuelve 0, alguien lo sacó antes (match).
                const removedCount = await this.redis.zrem(queueKey, userId);

                if (removedCount > 0) {
                    console.log(`⏱️ Timeout user ${userId} from ${mode}`);
                    
                    // Solo notificamos si confirmamos el borrado, para evitar confundir al cliente.
					const event: MatchQueueTimeoutEvent = {
						type: REDIS_CHANNELS.MATCH_QUEUE_TIMEOUT,
						timestamp: Date.now(),
						source: 'game-service',
						payload: {
							userId: userId,
							reason: 'Time limit exceeded. Please try again.'
						}
					};
					// Publicar en canal global
                    await this.redis.publish(REDIS_CHANNELS.EVENTS, JSON.stringify(event));
                }
            }
        }
    }


	/**
	 * leavePublicQueue
	 *Busca al usuario en TODAS las colas posibles y lo elimina.
	 */
	async leavePublicQueue(userId: string): Promise<void> {

		const client = this.redis;

		console.log(`🗑️ User ${userId} removing from queues`);

        // Object.values(GameMode) nos da ['classic', 'speed', 'retro']
        const modes = Object.values(GameMode);
        
        const promises = modes.map(mode => {
			const key = `match:queue:${mode}`;
            return client.zrem(key, userId);
        });
		
		// Limpia en todos los modes para asegurar la limpieza.
        await Promise.all(promises);
    }

	/**
     * createPrivateMatch
     * Crea una partida directamente entre dos usuarios conocidos.
     */
	async createPrivateMatch(
		userId: string,
		opponentId: string,
		config?: Partial<MatchSchemas.CreateMatchBodyType>): Promise<MatchTypes.Match> {

        // 1. Validaciones de Negocio
        if (userId === opponentId) {
            throw new SharedErrors.ConflictError('No puedes desafiarte a ti mismo');
        }

		const activeMatch = await this.matchRepo.findActiveMatchByUserId(userId);
		if (activeMatch)
			throw new SharedErrors.ConflictError('You are already in an active match');
        
        const activeMatchOpponent = await this.matchRepo.findActiveMatchByUserId(opponentId);
		if (activeMatchOpponent)
			throw new SharedErrors.ConflictError('Opponent is already in an active match');
        
        // 2. Obtener Nombres (Pre-Fetch a User)
        // Necesitamos los nombres ANTES de crear la fila en SQL.
        // Usamos Promise.all para que sea paralelo y rápido (los 2 players).
        const [p1Data, p2Data] = await Promise.all([
            this.fetchUserProfile(userId),
            this.fetchUserProfile(opponentId)
        ]);

        // 3. Construcción de la Entidad (El Servicio decide ID y Estado)
        const newMatch: MatchTypes.MatchRow = {
            id: randomUUID(),           // ID generado en lógica de negocio
            status: MatchConstants.MATCH_STATUS.PENDING,          // Nace pendiente de aceptación
			player1_id: userId,
			player1_username: p1Data.username, // <--- Usamos el dato del objeto
            player1_score: 0,
			player2_id: opponentId,
			player2_username: p2Data.username, // <--- Usamos el dato del objeto
            player2_score: 0,
            winner_id: null,
            created_at: Date.now(),
            finished_at: null,
            game_mode: config?.gameMode || 'classic',
            target_score: config?.targetScore || 11
        };

        // 4. Persistencia (Bubble Up de errores SQL)
        await this.matchRepo.create(newMatch); // Usamos el create genérico

        try {
            // 5. Mapeo
            let matchDomain = MatchMapper.toDomain(newMatch);
                
            // 6. Notificar invitación
			const event: MatchInviteEvent = {
                type: REDIS_CHANNELS.MATCH_INVITE,
                timestamp: Date.now(),
                source: 'game-service',
                payload: {
                    matchId: matchDomain.id,
                    inviterId: userId,
                    inviteeId: opponentId,
                    gameMode: config?.gameMode || GameMode.CLASSIC
                }
            };
            
            await this.redis.publish(REDIS_CHANNELS.EVENTS, JSON.stringify(event));

            return matchDomain;

        } catch (error) {
            console.error(`🔥 [Critical] Fallo post-creación. ROLLBACK.`, error);
            
            // ROLLBACK/REVIERTE ESTADO: Borramos la partida física si falló la notificación
            await this.matchRepo.deleteMatch(newMatch.id);
            throw new SharedErrors.ServiceError('redis','Error iniciando partida privada.');
        }
    }

	/**
     * createLocalMatch
     * Crea un "ticket" de partida en Redis. No toca la DB SQL.
     * TTL: 15 segundos (tiempo suficiente para que el front conecte el WS).
     */
    async createLocalMatch(userId: string, config?: Partial<MatchTypes.CreateMatchBody>): Promise<MatchTypes.Match> {
        
        // 1. Generar ID y Datos
        const matchId = randomUUID();
        const p1Data = await this.fetchUserProfile(userId); // Reutilizamos tu helper

        // 2. Crear Objeto Match (Cumpliendo el Schema, pero sin ID de DB real)
        const localMatch: MatchTypes.Match = {
            id: matchId,
            status: 'active', // Nace activa para que el front entre directo
            gameMode: config?.gameMode || GameMode.CLASSIC, // O lo que venga en config
            targetScore: config?.targetScore || 11,
            player1: {
                userId: userId,
                username: p1Data.username,
                score: 0,
                isWinner: false
            },
            player2: {
                userId: randomUUID(), // Generate unique UUID for guest player
                username: 'Guest Player', // El front puede sobreescribir esto visualmente
                score: 0,
                isWinner: false
            },
            winnerId: null,
            createdAt: new Date().toISOString()
        };

        // 3. Guardar en REDIS (Persistencia Efímera)
        // Clave: "match:local:{uuid}"
        const REDIS_KEY = `match:local:${matchId}`;
        
        // Serializamos el objeto completo para recuperarlo en GameService
        // 'EX', 15 -> Expira en 15 segundos
        await this.redis.set(REDIS_KEY, JSON.stringify(localMatch), 'EX', 15);

        console.log(`✅ [MatchService] Local match ticket created: ${matchId}`);

        return localMatch;
	}
	
	
	async getMatchHistory(
		userId: string,
		offset: number = 0): Promise<MatchTypes.Match[]> {
		
		const limit = 20;

		const rows = await this.matchRepo.findByUserId(userId, limit, offset);

		// Si no hay filas, devolvemos array vacío inmediatamente
		if (rows.length === 0) return [];
		
		// Mapeo
        // Como 'row' ya tiene player1_username y player2_username, 
        // MatchMapper.toDomain los rellena automáticamente.
        return rows.map(row => MatchMapper.toDomain(row));
	}


	// ========================================================================
    // MÉTODOS HELPERS
    // ========================================================================

	/**
     * handleUsernameChange
     * Coordina la actualización masiva de nombres en el historial
     * cuando un usuario actualiza su perfil.
     */
    async handleUsernameChange(userId: string, newUsername: string): Promise<void> {
        console.log(`🔄 [MatchService] Syncing username for User ${userId} -> ${newUsername}`);
        await this.matchRepo.updateUsernames(userId, newUsername);
    }

	/**
     * acceptMatch
     * Confirma una partida privada, cambia su estado y notifica.
     */
	async acceptMatch(userId: string, matchId: string): Promise<MatchTypes.Match> {
		
        // 1. Obtener la partida cruda (Row)
        const matchRow = await this.matchRepo.findById(matchId); 

        // 2. Guards
        if (!matchRow) throw new SharedErrors.NotFoundError('Match not found');
        if (matchRow.status !== MatchConstants.MATCH_STATUS.PENDING) throw new SharedErrors.ValidationError('Match is not pending');
        if (matchRow.player2_id !== userId) throw new SharedErrors.ForbiddenError('You are not the invited player');

        // 3. Actualizar estado en DB
        await this.matchRepo.updateStatus(matchId, 'active');

		try {
			// 4. Mapeo
			// Convertimos el Row crudo a Objeto de Dominio
			const matchDomain = MatchMapper.toDomain(matchRow);
			
			// Forzamos el estado a 'active' en el objeto en memoria porque toDomain usa el dato viejo
			matchDomain.status = MatchConstants.MATCH_STATUS.ACTIVE;

			// VALIDACIÓN
            // Si el mapper nos devuelve player2 undefined, algo grave pasa.
            if (!matchDomain.player2) {
                throw new SharedErrors.ServiceError('game', 'Match data corrupted: Player 2 missing');
			}
			
			// 5. Notificar inicio de partida (Redis)
			const event: MatchStartedEvent = {
                type: REDIS_CHANNELS.MATCH_STARTED,
                timestamp: Date.now(),
                source: 'game-service',
                payload: {
					matchId: matchDomain.id,
					// Accedemos a la estructura anidada que definimos en el Mapper
                    playerIds: [matchDomain.player1.userId, matchDomain.player2.userId] // seguro gracias al if anterior
                }
            };
            
            await this.redis.publish(REDIS_CHANNELS.EVENTS, JSON.stringify(event));

			return matchDomain;
		} catch (error) {
			console.error(`🔥 [Critical] Fallo al iniciar partida. ROLLBACK a PENDING.`, error);
    
			// COMPENSACIÓN: Revertir estado si falla la notificación/hidratación
            // Si falló el inicio, devolvemos la invitación a "pendiente" para que puedan reintentar.
            await this.matchRepo.updateStatus(matchId, MatchConstants.MATCH_STATUS.PENDING);

            throw new SharedErrors.ServiceError('game', 'Error al iniciar la partida. Por favor intenta aceptar de nuevo.');
		}
	}
	
	/**
     * rejectMatch
     * Rechaza una partida privada, cambia su estado y notifica.
     */
	async rejectMatch(userId: string, matchId: string): Promise<MatchTypes.Match> {
	
		// 1. Obtener la partida cruda (Row)
		const matchRow = await this.matchRepo.findById(matchId);

		// 2. Guards
		if (!matchRow) throw new SharedErrors.NotFoundError('Match not found');
		if (matchRow.status !== MatchConstants.MATCH_STATUS.PENDING) throw new SharedErrors.ValidationError('Match is not pending');
		if (matchRow.player2_id !== userId) throw new SharedErrors.ForbiddenError('Only the invited player can reject');

		// 3. Actualizar estado en DB
		await this.matchRepo.updateStatus(matchId, 'rejected');

		try {

			// 4. Mapeo
			// Convertimos el Row crudo a Objeto de Dominio
			const matchDomain = MatchMapper.toDomain(matchRow);
			matchDomain.status = MatchConstants.MATCH_STATUS.REJECTED; // Actualizacion manual en memoria

			// 5. Notificar rechazo (Redis)
			const event: MatchRejectedEvent = {
                type: REDIS_CHANNELS.MATCH_REJECTED,
                timestamp: Date.now(),
                source: 'game-service',
                payload: {
                    matchId: matchDomain.id,
                    rejectorId: userId,              // El que rechaza (player2)
                    inviterId: matchDomain.player1.userId   // El creador (player1)
                }
            };
            
            await this.redis.publish(REDIS_CHANNELS.EVENTS, JSON.stringify(event));

			return matchDomain;
		} catch (error) {
			console.error(`🔥 [Critical] Fallo post-rechazo.`, error);
			// En rechazo, el rollback es menos crítico, pero idealmente revertimos
            await this.matchRepo.updateStatus(matchId, MatchConstants.MATCH_STATUS.PENDING);
            throw new SharedErrors.ServiceError('game', 'Error rejecting match.');
		}
    }


	/**
	 * Limpia partidas privadas que estan en 'pending' en DB cuando el invitador se fue y 
	 * el invitado aún no las rechazo ni acepto. 
	 * Evita que los invitados acepten partidas fantasma.
	 **/
	async cancelPendingMatches(userId: string): Promise<void> {
		
        // 1. Buscamos las partidas creadas por este usuario que sigan PENDING
        const pendingMatches = await this.matchRepo.findPendingHostedByUser(userId);

        if (pendingMatches.length === 0) return;

        console.log(`🧹 [MatchService] Cleaning ${pendingMatches.length} pending matches for disconnected user ${userId}`);

        const promises = pendingMatches.map(async (match) => {
            // 1. Borrado físico (DB)
            await this.matchRepo.deleteMatch(match.id);

			// 2. TYPE GUARD
            // Si la DB dice que player2_id es null, no podemos enviar el evento.
            // Esto filtra datos corruptos.
            if (!match.player2_id) {
                console.warn(`⚠️ [MatchService] Found pending match ${match.id} without player2_id. Skipping notification.`);
                return; 
            }

            // Ahora TypeScript sabe que targetId es 'string' (no null)
			const targetId: string = match.player2_id;
			
            // 3. Construir evento
            const event: MatchCancelledEvent = {
                type: REDIS_CHANNELS.MATCH_CANCELLED,
                timestamp: Date.now(),
                source: 'game-service',
                payload: {
                    matchId: match.id,
                    cancelledById: match.player1_id,  // El creador (cleanup automático)
                    notifiedUserId: targetId,         // El invitado (player2)
                    reason: 'host_disconnected'
                }
            };

            // 4. Publicamos el evento usando la instancia inyectada
            return this.redis.publish(REDIS_CHANNELS.EVENTS, JSON.stringify(event));
        });

        // Ejecutamos todas las notificaciones en paralelo
        // Promise.allSettled es mejor aquí por si falla un publish, que no pare los demás borrados
        await Promise.allSettled(promises);
	}
	


	/**
	 * Limpia partidas privadas que estan en 'pending' mas 
	 * de 60 seg y las pone como 'expired' en DB. El invitado no
	 * las rechazo ni acepto. 
	 **/
	async prunePrivateInvites(): Promise<void> {
        this.matchRepo.expirePendingMatches();
        // Opcional: Podría loguear "Limpieza de privadas ejecutada" si quiero depurar.
    }


	/**
     * cancelPrivateMatch
     * Permite al creador (P1) revocar la invitación antes de que sea aceptada.
     */
	async cancelPrivateMatch(userId: string, matchId: string): Promise<void> {
	
        console.log(`👉 ⚙️ [Service] Cancelando invitación ${matchId} por usuario ${userId}`);

        // 1. Obtener la partida
        const matchRow = await this.matchRepo.findById(matchId);

		// 2. Guards (Validaciones)
        if (!matchRow) throw new SharedErrors.NotFoundError('Match not found');
        // Solo se puede cancelar si no ha empezado
        if (matchRow.status !== MatchConstants.MATCH_STATUS.PENDING) {
			throw new SharedErrors.ValidationError('Cannot cancel a match that is not pending');
        }
        // SEGURIDAD: Solo el creador (Player 1) puede cancelar SU invitación
        if (matchRow.player1_id !== userId) {
			throw new SharedErrors.ForbiddenError('You are not the creator of this match');
        }
		
		// Si es una partida privada "pending", TIENE que haber un player2_id.
		// Si no lo hay, la base de datos está corrupta o la lógica falló.
		if (!matchRow.player2_id) {
			throw new SharedErrors.ValidationError('Cannot cancel a match without an opponent');
		}

        // 3. Borrar de la DB (Hard Delete porque nunca ocurrió)
        // Al borrarla, liberamos a ambos usuarios del bloqueo de "Active Match".
        await this.matchRepo.deleteMatch(matchId);

        // 4. Notificar al invitado (Player 2)
        // Es importante para que su interfaz se limpie si tenía el popup abierto.
		const event: MatchCancelledEvent = {
                type: REDIS_CHANNELS.MATCH_CANCELLED,
                timestamp: Date.now(),
                source: 'game-service',
                payload: {
					matchId: matchId,
					cancelledById: userId,               // El creador que cancela
					notifiedUserId: matchRow.player2_id, // El invitado
                    reason: 'The invitation was cancelled by creator'
                }
            };
            
            await this.redis.publish(REDIS_CHANNELS.EVENTS, JSON.stringify(event));

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
