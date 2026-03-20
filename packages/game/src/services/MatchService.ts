import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import { MatchRepository } from '../repositories/MatchRepository.js';
import {
	MatchTypes,
	MatchSchemas,
	SharedErrors,
	GameConstants,
	MatchConstants,
	TRANSCENDENCE_CHANNEL,
	TRANSCENDENCE_EVENTS,
	TranscendenceEventsTypes,
	Utils,
	BOT_USER_ID,
	BOT_USERNAME
} from '@transcendence/shared';
import { createLogger, type AppLogger } from '@transcendence/shared';
import { GameEnv } from '../config.js';

/**
* MatchService
* Gestiona la lógica de negocio para la creación y orquestación de partidas.
*/
export class MatchService {
	private matchRepo: MatchRepository;
	private redis: Redis;
	private log: AppLogger = createLogger('MatchService');
	
	// CONSTRUCTOR: INYECCIÓN DE DEPENDENCIA
	// El servicio NO se preocupa de dónde viene Redis, solo pide una instancia.
	constructor(matchRepo: MatchRepository, redisClient: Redis) { // Recibe la instancia, no la crea.
		this.matchRepo = matchRepo;
		this.redis = redisClient;
	}
	
	//===========NUEVO MANAGER GENERAL==========
	/**
	* handleCreateMatch
	* ORQUESTADOR CENTRAL: Recibe la petición bruta y decide qué hacer 
	* segun sea una partida publica, local o privada.
	* Reemplaza la lógica de decisión que antes tenía el Controller.
	*/
	async handleCreateMatch(userId: string, body: MatchSchemas.CreateMatchBodyType) {
		
		// Extraemos lo que necesitamos
		const { matchType, opponentId, gameMode } = body;
		
		// 1. VALIDACIÓN DE NEGOCIO (Antes estaba en el Controller)
		// El servicio protege su propia integridad.
		if (matchType === 'private' && !opponentId) {
			throw new SharedErrors.ValidationError('Private match requires an opponentId');
		}
		
		// 2. ENRUTAMIENTO INTELIGENTE
		if (matchType === 'public') {
			// Usamos '??' para usar CLASSIC si gameMode es undefined
			// ?? significa: Si lo de la izquierda es null o undefined, usa lo de la derecha".
			return this.joinPublicQueue(userId, gameMode ?? GameConstants.GAME_MODE.CLASSIC);
		}
		
		if (matchType === 'local') {
			// Pasamos el body completo como config
			return this.createLocalMatch(userId, body);
		}
		
		if (matchType === 'bot') {
    		return this.createBotMatch(userId, body);
		}
		// 3. DEFAULT: PRIVATE
		// Si llegamos aquí, sabemos que opponentId existe gracias al paso 1.
		// El signo ! le dice a TS: "Confía en mí, esto no es null".
		return this.createPrivateMatch(userId, opponentId!, body);
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
	async joinPublicQueue(
		userId: string,
		gameModeName: GameConstants.GameModeType,
		targetScore: number = GameConstants.GAME_CONSTANTS.SCORE.DEFAULT
	): Promise<MatchTypes.JoinQueueResponse> {
		// Guard: Usuario no en partida activa?
		const activeMatch = await this.matchRepo.findActiveMatchByUserId(userId);
		if (activeMatch) throw new SharedErrors.ConflictError('User already has an active match. If you just forfeited, you must cooldown 15 seconds.');
		
		const QUEUE_KEY = `match:queue:${gameModeName}`;
		const TICKET_TIMESTAMP = Date.now();
		
		this.log.info({ userId, queue: QUEUE_KEY }, 'User joining queue');
		
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
				player1_avatar: p1Data.avatar,
				player1_score: 0,
				player2_id: userId,
				player2_username: p2Data.username,
				player2_avatar: p2Data.avatar,
				player2_score: 0,
				winner_id: null,
				created_at: Date.now(),
				finished_at: null,
				game_mode: gameModeName,
				target_score: targetScore,
			};
			
			// PERSISTENCIA
			await this.matchRepo.create(newMatch);
			
			// Notificar al oponente vía Redis Pub/Sub (match_found vs mi_username)			
			// Defino el evento con tipado estricto. Si falta 'timestamp' o 'payload' está mal, falla.
			const event: TranscendenceEventsTypes.MatchFoundEvent = {
				type: TRANSCENDENCE_EVENTS.MATCH_FOUND, // Usa la constante ('redis:match:found')
				timestamp: Date.now(),
				source: 'game-service', // Opcional, pero útil para debugar
				payload: {  // al definir este obj, TypeScrpit busca las variables en el ambito local.
					matchId: newMatch.id,     // Mapea los datos de tu dominio
					playerIds: [opponentId, userId]
				}
			};
			// Publicamos en el CANAL UNICO de eventos (definido en shared)
			await this.redis.publish(TRANSCENDENCE_CHANNEL, JSON.stringify(event));
			
			const match = await this.matchRepo.findById(newMatch.id);
			
			if (!match) {
				throw new SharedErrors.NotFoundError(
					'Match not found after creation',
					'MatchService.joinPublicQueue',
					{ matchId: newMatch.id }
				);
			}
			
			return {
				outcome: 'match_found',
				match: match
			};
		} catch (error) {
			this.log.error({ err: error, opponentId }, 'CRITICAL: Error creating match, restoring opponent to queue');
			
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
		
		for (const mode of Object.values(GameConstants.GAME_MODE)) {
			const queueKey = `match:queue:${mode}`;
			
			// 1. FETCH: Obtenemos candidatos
			const expiredUserIds = await this.redis.zrangebyscore(queueKey, '-inf', limit);
			
			// 2. PROCESS: Iteramos uno a uno para evitar Race Conditions
			for (const userId of expiredUserIds) {
				// Intentamos borrar. ZREM devuelve el número de elementos borrados.
				// Si devuelve 1, fuimos nosotros. Si devuelve 0, alguien lo sacó antes (match).
				const removedCount = await this.redis.zrem(queueKey, userId);
				
				if (removedCount > 0) {
					this.log.info({ userId, mode }, 'Queue timeout — user removed');

					// Solo notificamos si confirmamos el borrado, para evitar confundir al cliente.
					const event: TranscendenceEventsTypes.MatchQueueTimeoutEvent = {
						type: TRANSCENDENCE_EVENTS.MATCH_QUEUE_TIMEOUT,
						timestamp: Date.now(),
						source: 'game-service',
						payload: {
							userId: userId,
							reason: 'Time limit exceeded. Please try again.'
						}
					};
					// Publicar en canal global
					await this.redis.publish(TRANSCENDENCE_CHANNEL, JSON.stringify(event));
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
		
		this.log.info({ userId }, 'Removing user from queues');

		// Object.values(GameMode) nos da ['classic', 'speed', 'pro']
		const modes = Object.values(GameConstants.GAME_MODE);
		
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
		config?: Partial<MatchSchemas.CreateMatchBodyType>
	): Promise<MatchTypes.Match> {
		
		// 1. Validaciones de Negocio
		if (userId === opponentId) {
			throw new SharedErrors.ConflictError(
				'No puedes desafiarte a ti mismo',
				'MatchService.createPrivatMatch',
				{ 
					userId: userId,
					opponentId: config?.opponentId
				}
			);
		}
		
		const activeMatch = await this.matchRepo.findActiveMatchByUserId(userId);
		if (activeMatch)
			throw new SharedErrors.ConflictError(
			'You are already in an active match',
			'MatchService.createPrivatMatch',
			{
				userId: userId,
				opponentId: opponentId,
				activeMatch: activeMatch.id
			}
		);
		
		const activeMatchOpponent = await this.matchRepo.findActiveMatchByUserId(opponentId);
		if (activeMatchOpponent)
			throw new SharedErrors.ConflictError(
			'Opponent is already in an active match',
			'MatchService.createPrivatMatch',
			{
				userId: userId,
				opponentId: opponentId,
				activeMatch: activeMatchOpponent.id
			}
		);
			
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
			player1_avatar: p1Data.avatar,
			player1_score: 0,
			player2_id: opponentId,
			player2_username: p2Data.username, // <--- Usamos el dato del objeto
			player2_avatar: p2Data.avatar,
			player2_score: 0,
			winner_id: null,
			created_at: Date.now(),
			finished_at: null,
			game_mode: config?.gameMode || GameConstants.GAME_MODE.CLASSIC,
			target_score: config?.targetScore ?? GameConstants.GAME_CONSTANTS.SCORE.DEFAULT
		};
		
		// 4. Persistencia (Bubble Up de errores SQL)
		await this.matchRepo.create(newMatch); // Usamos el create genérico
		// TODO debería recibir un domain y mapear a row dentro del repositorio
		
		try {
			// 6. Notificar invitación
			const event: TranscendenceEventsTypes.MatchInviteEvent = {
				type: TRANSCENDENCE_EVENTS.MATCH_INVITE,
				timestamp: Date.now(),
				source: 'game-service',
				payload: {
					matchId: newMatch.id,
					inviterId: userId,
					inviterUsername: p1Data.username,
					inviterAvatar: p1Data.avatar,
					inviteeId: opponentId,
					gameMode: config?.gameMode || GameConstants.GAME_MODE.CLASSIC,
					expiresAt: newMatch.created_at + MatchConstants.PRIVATE_INVITATION_TIMEOUT_MS
				}
			} satisfies TranscendenceEventsTypes.MatchInviteEvent;
			
			await this.redis.publish(TRANSCENDENCE_CHANNEL, JSON.stringify(event));
			
			const match = await this.matchRepo.findById(newMatch.id);
			
			if (!match) {
				throw new SharedErrors.NotFoundError(
					'Match not found',
					'Match Service.createPrivateMatch',
					{ matchId: newMatch.id }
				);
			}
			return match;
		} catch (error) {
			this.log.error({ err: error }, 'CRITICAL: Post-creation failure, rolling back');
			
			// ROLLBACK/REVIERTE ESTADO: Borra la partida física al fallar la notificación
			await this.matchRepo.deleteMatch(newMatch.id);
			
			throw new SharedErrors.ServiceError(
				'redis',
				'Error al enviar mensaje para iniciar partida privada.',
				{
					newMatchId: newMatch.id,
					player1Id: newMatch.player1_id,
					player2Id: newMatch.player2_id
				}
			);
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
			gameMode: config?.gameMode || GameConstants.GAME_MODE.CLASSIC, // O lo que venga en config
			targetScore: config?.targetScore ?? GameConstants.GAME_CONSTANTS.SCORE.DEFAULT,
			player1: {
				userId: userId,
				username: p1Data.username,
				avatar: p1Data.avatar,
				score: 0,
				isWinner: false
			},
			player2: {
				userId: Utils.generateUserId(),
				username: 'Guest Player', // El front puede sobreescribir esto visualmente
				avatar: GameEnv.CLOUDINARY_DEFAULT_AVATAR(),
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
		
		this.log.info({ matchId }, 'Local match ticket created');
		
		return localMatch;
	}
	
	
	/**
	 * createBotMatch
	 * Crea un ticket de partida contra el bot en Redis.
	 * Igual que createLocalMatch pero con BOT_USER_ID como player2.
	 * No toca la DB SQL. TTL: 30 segundos (el bot necesita
	 * más tiempo que el frontend para conectarse).
	 */
	async createBotMatch(
		userId: string,
		config?: Partial<MatchTypes.CreateMatchBody>
	): Promise<MatchTypes.Match> {

		const matchId = randomUUID();
		const p1Data  = await this.fetchUserProfile(userId);

		const botMatch: MatchTypes.Match = {
			id: matchId,
			status: 'active',
			gameMode: config?.gameMode ?? GameConstants.GAME_MODE.CLASSIC,
			targetScore: config?.targetScore ?? GameConstants.GAME_CONSTANTS.SCORE.DEFAULT,
			player1: {
				userId:   userId,
				username: p1Data.username,
				avatar:   p1Data.avatar,
				score:    0,
				isWinner: false
			},
			player2: {
				userId:   BOT_USER_ID,   // ID fijo del bot
				username: BOT_USERNAME,
				avatar:   '',
				score:    0,
				isWinner: false
			},
			winnerId:  null,
			createdAt: new Date().toISOString()
		};

		// Guardamos con la misma clave que las partidas locales.
		// GameService.joinMatch() ya sabe leer este formato.
		const REDIS_KEY = `match:local:${matchId}`;
		await this.redis.set(REDIS_KEY, JSON.stringify(botMatch), 'EX', 30);

		this.log.info({ matchId }, 'Bot match ticket created');

		// Publicamos el evento para que el servicio bot lo reciba
		const event: TranscendenceEventsTypes.MatchBotRequestedEvent = {
			type:      TRANSCENDENCE_EVENTS.MATCH_BOT_REQUESTED,
			timestamp: Date.now(),
			source:    'game-service',
			payload: {
				matchId,
				gameMode: botMatch.gameMode
			}
		};
		await this.redis.publish(TRANSCENDENCE_CHANNEL, JSON.stringify(event));

		return botMatch;
	}


	async getMatchHistory(
		userId: string,
		offset: number = 0,
		limit: number = 6
	): Promise<MatchTypes.Match[]> {
		return await this.matchRepo.findByUserId(userId, limit, offset);
	}
	
	
	// ========================================================================
	// MÉTODOS HELPERS
	// ========================================================================
	
	/**
	* handleUsernameChange
	* Coordina la actualización masiva de nombres en el historial
	* cuando un usuario actualiza su perfil.
	*/
	async handleUserUpdate(userId: string, newUsername: string, newAvatar: string): Promise<void> {
		this.log.info({ userId, newUsername }, 'Syncing user profile in match history');

		await this.matchRepo.updateUser(userId, newUsername, newAvatar);
	}
	
	/**
	* acceptMatch
	* Confirma una partida privada, cambia su estado y notifica.
	*/
	async acceptMatch(userId: string, matchId: string): Promise<MatchTypes.Match> {
		
		// 1. Obtener la partida
		const match = await this.matchRepo.findById(matchId); 
		
		// 2. Guards
		if (!match)
			throw new SharedErrors.NotFoundError('Partida no encontrada');
		
		if (match.status !== MatchConstants.MATCH_STATUS.PENDING)
			throw new SharedErrors.ValidationError('Partida no está pendiente');
		
		if (match.player2?.userId !== userId)
			throw new SharedErrors.ForbiddenError('No eres el jugador invitado');
		
		// 3. Actualizar estado en DB
		await this.matchRepo.updateStatus(matchId, MatchConstants.MATCH_STATUS.ACTIVE);
		
		try {
			// Forzamos el estado a 'active' en el objeto en memoria porque toDomain usa el dato viejo
			match.status = MatchConstants.MATCH_STATUS.ACTIVE;
			
			// VALIDACIÓN
			// Si el mapper nos devuelve player2 undefined, algo grave pasa.
			if (!match.player2) {
				throw new SharedErrors.ServiceError('game', 'Match data corrupted: Player 2 missing');
			}
			
			// 5. Notificar inicio de partida (Redis)
			const event: TranscendenceEventsTypes.MatchStartedEvent = {
				type: TRANSCENDENCE_EVENTS.MATCH_STARTED,
				timestamp: Date.now(),
				source: 'game-service',
				payload: {
					matchId: match.id,
					// Accedemos a la estructura anidada que definimos en el Mapper
					playerIds: [match.player1.userId, match.player2.userId] // Seguro gracias al if anterior
				}
			} satisfies TranscendenceEventsTypes.MatchStartedEvent;
			
			await this.redis.publish(TRANSCENDENCE_CHANNEL, JSON.stringify(event));
			
			return match;
		} catch (error) {
			this.log.error({ err: error, matchId }, 'CRITICAL: Failed to start match, rolling back to PENDING');

			
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
		const match = await this.matchRepo.findById(matchId);
		
		// 2. Guards
		if (!match) throw new SharedErrors.NotFoundError('Match not found');
		if (match.status !== MatchConstants.MATCH_STATUS.PENDING) throw new SharedErrors.ValidationError('Match is not pending');
		if (match.player2?.userId !== userId) throw new SharedErrors.ForbiddenError('Only the invited player can reject');
		
		// 3. Actualizar estado en DB
		await this.matchRepo.updateStatus(matchId, MatchConstants.MATCH_STATUS.REJECTED);
		
		try {
			match.status = MatchConstants.MATCH_STATUS.REJECTED; // Actualizacion manual en memoria
			
			// 5. Notificar rechazo (Redis)
			const event: TranscendenceEventsTypes.MatchRejectedEvent = {
				type: TRANSCENDENCE_EVENTS.MATCH_REJECTED,
				timestamp: Date.now(),
				source: 'game-service',
				payload: {
					matchId: match.id,
					rejectorId: userId,              // El que rechaza (player2)
					inviterId: match.player1.userId   // El creador (player1)
				}
			} satisfies TranscendenceEventsTypes.MatchRejectedEvent;
			
			await this.redis.publish(TRANSCENDENCE_CHANNEL, JSON.stringify(event));
			
			return match;
		} catch (error) {
			this.log.error({ err: error, matchId }, 'CRITICAL: Post-reject failure');
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
		
		this.log.info({ userId, count: pendingMatches.length }, 'Cleaning pending matches for disconnected user');
		
		const promises = pendingMatches.map(async (match) => {
			// 1. Borrado físico (DB)
			await this.matchRepo.deleteMatch(match.id);
			
			// 2. TYPE GUARD
			// Si la DB dice que player2_id es null, no podemos enviar el evento.
			// Esto filtra datos corruptos.
			if (!match.player2?.userId) {
				this.log.warn({ matchId: match.id }, 'Pending match missing player2_id, skipping notification');

				return; 
			}
			
			// Ahora TypeScript sabe que targetId es 'string' (no null)
			const targetId: string = match.player2.userId;
			
			// 3. Construir evento
			const event: TranscendenceEventsTypes.MatchCancelledEvent = {
				type: TRANSCENDENCE_EVENTS.MATCH_CANCELLED,
				timestamp: Date.now(),
				source: 'game-service',
				payload: {
					matchId: match.id,
					cancelledById: match.player1.userId,  // El creador (cleanup automático)
					notifiedUserIds: [match.player1.userId, targetId ],         // El invitado (player2)
					reason: GameConstants.MATCH_CANCELLED_REASON.HOST_DISCONNECTED
				}
			} satisfies TranscendenceEventsTypes.MatchCancelledEvent;
			
			// 4. Publicamos el evento usando la instancia inyectada
			return this.redis.publish(TRANSCENDENCE_CHANNEL, JSON.stringify(event));
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
		// Obtiene todas las invitaciones (partidas que están 'pending') y caducadas
		// Cambia su status a 'expired'
		const expired = await this.matchRepo.expirePendingMatches();
		// Si no hay invitaciones caducadas termina
		if (expired.length === 0) return;
		// Para cada invitación caducada, crea un evento y lo publica en Redis 
		const promises = expired.map(({ matchId, player1Id, player2Id }) => {
			// Construye el nuevo evento que notificará al sistema
			const event: TranscendenceEventsTypes.MatchCancelledEvent = {
				type: TRANSCENDENCE_EVENTS.MATCH_CANCELLED,
				timestamp: Date.now(),
				source: 'game-service',
				payload: {
					matchId,
					cancelledById: 'system',
					notifiedUserIds: [ player1Id, player2Id ],
					reason: GameConstants.MATCH_CANCELLED_REASON.INVITATION_EXPIRED
				}
			} satisfies TranscendenceEventsTypes.MatchCancelledEvent;
			// Publica el evento al canal transcendence:events
			return this.redis.publish(TRANSCENDENCE_CHANNEL, JSON.stringify(event)); 
		});
		// Espera que todas las publicaciones terminen sin fallar si alguna falla
		await Promise.allSettled(promises);
	}
	
	/**
	* cancelPrivateMatch
	* Permite al creador (P1) revocar la invitación antes de que sea aceptada.
	*/
	async cancelPrivateMatch(userId: string, matchId: string): Promise<void> {
		
		this.log.info({ matchId, userId }, 'Cancelling private invitation');
		
		// 1. Obtener la partida
		const matchRow = await this.matchRepo.findById(matchId);
		
		// 2. Guards (Validaciones)
		if (!matchRow) throw new SharedErrors.NotFoundError('Match not found');
		// Solo se puede cancelar si no ha empezado
		if (matchRow.status !== MatchConstants.MATCH_STATUS.PENDING) {
			throw new SharedErrors.ValidationError('Cannot cancel a match that is not pending');
		}
		// SEGURIDAD: Solo el creador (Player 1) puede cancelar SU invitación
		if (matchRow.player1.userId !== userId) {
			throw new SharedErrors.ForbiddenError('You are not the creator of this match');
		}
		
		// Si es una partida privada "pending", TIENE que haber un player2_id.
		// Si no lo hay, la base de datos está corrupta o la lógica falló.
		if (!matchRow.player2?.userId) {
			throw new SharedErrors.ValidationError('Cannot cancel a match without an opponent');
		}
		
		// 3. Borrar de la DB (Hard Delete porque nunca ocurrió)
		// Al borrarla, liberamos a ambos usuarios del bloqueo de "Active Match".
		await this.matchRepo.deleteMatch(matchId);
		
		// 4. Notificar al invitado (Player 2)
		// Es importante para que su interfaz se limpie si tenía el popup abierto.
		const event: TranscendenceEventsTypes.MatchCancelledEvent = {
			type: TRANSCENDENCE_EVENTS.MATCH_CANCELLED,
			timestamp: Date.now(),
			source: 'game-service',
			payload: {
				matchId: matchId,
				cancelledById: userId,               // El creador que cancela
				notifiedUserIds: [ matchRow.player1.userId, matchRow.player2.userId ], // El invitado
				reason: GameConstants.MATCH_CANCELLED_REASON.HOST_CANCELLED
			}
		} satisfies TranscendenceEventsTypes.MatchCancelledEvent;
		
		await this.redis.publish(TRANSCENDENCE_CHANNEL, JSON.stringify(event));
	}
	
	/**
	* fetchUserProfile
	* Helper para la comunicación S2S (Service-to-Service)
	* (pide al modulo User por HTTP el username del userId)
	*/
	private async fetchUserProfile(
		userId: string
	): Promise<{
		username: string,
		avatar: string
	}>{
		// 1. Obtener URL Base
		const baseUrl = GameEnv.USER_SERVICE_URL();
		
		// Usamos la ruta interna, no la pública (/api)
		// Esta ruta interna esta protegida por el SERVICE_SECRET en lugar del JWT
		const targetUrl = `${baseUrl}/internal/users/by-id/${userId}`;
		
		try {
			const response = await fetch(targetUrl, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					'x-service-secret': GameEnv.SERVICE_SECRET()
				}
			});
			
			// 3. Manejo de errores HTTP
			if (!response.ok) {
				this.log.warn({ userId, status: response.status }, 'User Service error fetching profile');
				return { username: 'Unknown', avatar: '' };
			}
			
			// 4. Parsear respuesta
			const userData = await response.json() as { username: string, avatar: string };
			return { username: userData.username, avatar: userData.avatar };
			
		} catch (error) {
			this.log.error({ err: error, baseUrl }, 'Connection error with User Service');
			return { username: 'Unknown', avatar: '' };
		}
	}
}
	