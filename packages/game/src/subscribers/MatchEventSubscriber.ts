// SUBSCRIPCION DEL SERVICIO GAME A LOS EVENTOS REDIS

import { Redis } from 'ioredis';
import { MatchService } from '../services/MatchService.js';
import { GameService } from '../services/GameService.js';
import { TRANSCENDENCE_EVENTS, TranscendenceEventsTypes, Utils } from '@transcendence/shared';
import { GameEnv } from '../config.js'; 

export class MatchEventSubscriber {
    private subscriber: Redis;
    private matchService: MatchService;
	private gameService: GameService;

    constructor(matchService: MatchService, gameService: GameService) {
        this.matchService = matchService;
		this.gameService = gameService;
		
        // 1. Obtener configuración usando tu función del namespace GameEnv
        // Esto valida host, puerto, password y db automáticamente.
        const redisConfig = GameEnv.getRedisConfig();
        
        console.log(`🔌 [Subscriber] Configurando Redis hacia ${redisConfig.host}:${redisConfig.port}`);

        // 2. Usar la Factory de Shared (Patrón del proyecto)
        this.subscriber = Utils.createRedisClient(redisConfig);
    }

    public async connect() {
        try {
            console.log('🎧 [MatchEventSubscriber] Connecting...');

            // Nos suscribimos al canal de eventos definido en Shared
            await this.subscriber.subscribe(TRANSCENDENCE_EVENTS.EVENTS);
            
            // Escuchamos mensajes
            this.subscriber.on('message', (channel, message) => {
                if (channel === TRANSCENDENCE_EVENTS.EVENTS) {
                    this.handleMessage(message);
                }
            });

            console.log('✅ [MatchEventSubscriber] Ready. Listening on channel:', TRANSCENDENCE_EVENTS.EVENTS);
            
        } catch (error) {
            console.error('❌ [MatchEventSubscriber] Failed to subscribe:', error);
        }
    }

    private handleMessage(message: string) {
		try {
			// 1. Casteamos a SystemEvent para que TypeScript nos ayude
			const event = JSON.parse(message) as TranscendenceEventsTypes.SystemEvent;
			
			// Validación defensiva básica
			if (!event || !event.type) return;

			// TRUCO: Casteamos a 'any' temporalmente para extraer datos 
            // sin que TypeScript se queje de las uniones estrictas.
            const evtAny = event as any;

			switch (event.type) {
				// CASO 1: Desconexión
				case TRANSCENDENCE_EVENTS.USER_DISCONNECTED:
					// Aquí TS sabe que es un UserDisconnectedEvent.
					// Verificamos si usamos 'targetUserId' (legacy) o 'payload.userId' (estándar).
					// Usamos una verificación segura:
					const disconnectedId = evtAny.targetUserId || evtAny.payload?.userId;

					if (disconnectedId) {
						console.log(`⚡ [MatchEventSubscriber] Handling disconnect for: ${disconnectedId}`);
							
						// EJECUCIÓN PARALELA:
						// 1. Limpiar colas de Matchmaking (MatchService)
						// 2. Pausar partidas activas (GameService) - NUEVO
						Promise.allSettled([
							this.matchService.leavePublicQueue(disconnectedId),
							this.matchService.cancelPendingMatches(disconnectedId),
							this.gameService.handleDisconnect(disconnectedId)
						]).then((results) => {
							results.forEach((result, index) => {
								if (result.status === 'rejected') {
									console.error(`❌ Cleanup task ${index} failed for ${disconnectedId}:`, result.reason);
								}
							});
						});
					}
					break;
				
				
				// CASO 2: Actualización de Perfil
				case TRANSCENDENCE_EVENTS.USER_PROFILE_UPDATED:				
					const pUserId = evtAny.targetUserId || evtAny.payload?.userId;
					const username = evtAny.payload?.username;
					
					if (pUserId && username) {
						console.log(`📝 [Subscriber] Profile update received for ${pUserId}`);
						this.matchService.handleUsernameChange(pUserId, username)
							.catch(err => console.error('❌ Username sync error:', err));
					}
				break;
				
				default:
					// Ignoramos eventos que no nos interesan
					break;
			}

        } catch (error) {
            console.error('❌ Error parsing Redis message:', error);
        }
    }
}