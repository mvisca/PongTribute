// SUBSCRIPCION DEL SERVICIO GAME A LOS EVENTOS REDIS

import { Redis } from 'ioredis';
import { MatchService } from '../services/MatchService.js';
import { GameService } from '../services/GameService.js';
import {
	TRANSCENDENCE_CHANNEL,
	TRANSCENDENCE_EVENTS,
	TranscendenceEventsTypes,
	Utils
} from '@transcendence/shared';
import { GameEnv } from '../config.js';


export class MatchEventSubscriber {
	private subscriber: Redis;
	private matchService: MatchService;
	private gameService: GameService;
	
	constructor(matchService: MatchService, gameService: GameService) {
		this.matchService = matchService;
		this.gameService = gameService;
		
		// 1. Obtener configuración usando la función del namespace GameEnv
		// Esto valida host, puerto, password y db automáticamente.
		const redisConfig = GameEnv.getRedisConfig();
		
		console.log(`[MATCH-SUBSCRIBER] Configuring Redis at ${redisConfig.host}:${redisConfig.port}`);
		
		// 2. Usar la Factory de Shared (Patrón del proyecto)
		this.subscriber = Utils.createRedisClient(redisConfig);
	}
	
	public async connect() {
		try {
			console.log('[MATCH-SUBSCRIBER] Connecting to Pub/Sub...');
			
			// Nos suscribimos al canal de eventos definido en Shared
			await this.subscriber.subscribe(TRANSCENDENCE_CHANNEL);
			
			// Escuchamos mensajes
			this.subscriber.on('message', (channel, message) => {
				if (channel === TRANSCENDENCE_CHANNEL) {
					this.handleMessage(message);
				}
			});
			
			console.log('[MATCH-SUBSCRIBER] Ready. Listening on channel:', TRANSCENDENCE_CHANNEL);
			
		} catch (error) {
			console.error('[MATCH-SUBSCRIBER] Failed to subscribe:', error);
		}
	}
	
	private handleMessage(message: string) {
		try {
			// 1. Casteamos a SystemEvent para que TypeScript nos ayude
			const event = JSON.parse(message) as TranscendenceEventsTypes.SystemEvent;
			
			// Validación defensiva básica
			if (!event || !event.type || !event.payload) return;
			
			switch (event.type) {
				// CASO 1: Desconexión
				case TRANSCENDENCE_EVENTS.USER_DISCONNECTED: {
					// El evento UserDisconnected NO tiene userId en el payload.
					// Lo tiene en la propiedad raíz 'targetUserId'.
					// Hacemos un cast a un tipo intersección para acceder a la propiedad sin error.
					const disconnectedEvent = event as TranscendenceEventsTypes.SystemEvent & { targetUserId: string };
					const userId = disconnectedEvent.targetUserId;
					
					if (userId) {
						console.log(`[MATCH-SUBSCRIBER] User disconnect: ${userId}`);
						
						// Si falla uno, no detiene a los otros
						Promise.allSettled([
							this.matchService.leavePublicQueue(userId),
							this.matchService.cancelPendingMatches(userId),
							this.gameService.handleDisconnect(userId)
						]);
					} else {
						console.warn('[MATCH-SUBSCRIBER] User disconnected event missing targetUserId', event);
					}
					break;
				}
				
				// CASO 2: Actualización de Perfil
				case TRANSCENDENCE_EVENTS.USER_PROFILE_UPDATED: {
					// El evento UserProfileUpdated tiene targetUserId en la raíz
					// y el payload contiene los datos cambiados (username, avatar, etc.)
					const updateEvent = event as TranscendenceEventsTypes.UserProfileUpdatedEvent;
					
					const userId = updateEvent.targetUserId;
					const username = updateEvent.payload?.username;
					const avatar = updateEvent.payload?.avatar;
					
					if (userId && username && avatar) {
						console.log(`[MATCH-SUBSCRIBER] Syncing profile for ${username} (${userId})`);
						
						// 1. Actualizar DB (Historial y registros persistentes)
						this.matchService.handleUserUpdate(userId, username, avatar)
							.catch(err => console.error('[MATCH-SUBSCRIBER] DB update error:', err));
						
						// 2. Actualizar Memoria (Sesión activa en RAM)
						this.gameService.updatePlayerInActiveMatch(userId, username, avatar);
					} else {
						// Log de advertencia si llega el evento pero sin los datos necesarios
						if (!username) console.warn(`[MATCH-SUBSCRIBER] Profile update for ${userId} missing username`);
					}
					break;
				}
				
				default:
				// Ignoramos eventos que no nos interesan
				break;
			}
		} catch (error) {
			console.error('[MATCH-SUBSCRIBER] Error parsing Redis message:', error);
		}
	}
	
	// Cierra limpiamente la conexion Redis
	public async disconnect() {
		if (this.subscriber) {
			console.log('[MATCH-SUBSCRIBER] Disconnecting...');
			await this.subscriber.quit();
		}
	}
}
