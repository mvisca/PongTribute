// SUBSCRIPCION DEL SERVICIO GAME A LOS EVENTOS REDIS

import { Redis } from 'ioredis';
import { MatchService } from '../services/MatchService.js';
import { GameService } from '../services/GameService.js';
import {
	TRANSCENDENCE_CHANNEL,
	TRANSCENDENCE_EVENTS,
	TranscendenceEventsTypes,
} from '@transcendence/shared';
import { createLogger, type AppLogger } from '@transcendence/shared';


export class MatchEventSubscriber {
	private subscriber: Redis;
	private matchService: MatchService;
	private gameService: GameService;
	private connected: boolean = false;
	private log: AppLogger = createLogger('MatchEventSubscriber');

	constructor(matchService: MatchService, gameService: GameService, subscriberRedis: Redis) {
		this.matchService = matchService;
		this.gameService = gameService;
		this.subscriber = subscriberRedis;
	}
	
	public async connect() {
		try {
			this.log.info('Connecting to Pub/Sub...');
			
			// Nos suscribimos al canal de eventos definido en Shared
			await this.subscriber.subscribe(TRANSCENDENCE_CHANNEL);
			
			// Escuchamos mensajes
			this.subscriber.on('message', (_channel, message) => {
					this.handleMessage(message);
			});
			
			this.log.info({ channel: TRANSCENDENCE_CHANNEL }, 'Ready — listening for events');
			
			this.connected = true;

		} catch (error) {
			this.connected = false;
			this.log.error({ err: error }, 'Failed to subscribe to Redis channel');
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
						this.log.info({ userId }, 'User disconnected — cleaning up');
						
						// Si falla uno, no detiene a los otros
						Promise.allSettled([
							this.matchService.leavePublicQueue(userId),
							this.matchService.cancelPendingMatches(userId),
							this.gameService.handleDisconnect(userId)
						]);
					} else {
						this.log.warn({ event }, 'User disconnected event missing targetUserId');
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
						this.log.info({ userId, username }, 'Syncing profile update');

						
						// 1. Actualizar DB (Historial y registros persistentes)
						this.matchService.handleUserUpdate(userId, username, avatar)
							.catch(err => this.log.error({ err }, 'DB update error on profile change'));
						
						// 2. Actualizar Memoria (Sesión activa en RAM)
						this.gameService.updatePlayerInActiveMatch(userId, username, avatar);
					} else {
						// Log de advertencia si llega el evento pero sin los datos necesarios
						if (!username) this.log.warn({ userId }, 'Profile update event missing username');
					}
					break;
				}
				
				default:
				// Ignoramos eventos que no nos interesan
				break;
			}
		} catch (error) {
			this.log.error({ err: error }, 'Error parsing Redis message');
		}
	}
	
	// Cierra limpiamente la conexion Redis
	public async disconnect() {
		if (this.subscriber) {
			this.log.info('Disconnecting from Pub/Sub');
			this.connected = false;
			await this.subscriber.quit();
		}
	}

	// Para healthCheck
	public isConnected() {
		return this.connected;
	}
}
