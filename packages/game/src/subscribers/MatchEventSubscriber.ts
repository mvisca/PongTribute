// SUBSCRIPCION DEL SERVICIO GAME A LOS EVENTOS REDIS

import { Redis } from 'ioredis';
import { MatchService } from '../services/MatchService.js';
import { REDIS_CHANNELS, SystemEvent, Utils } from '@transcendence/shared';
// Importamos la Configuración (que es un Namespace)
import { GameEnv } from '../config.js'; 

export class MatchEventSubscriber {
    private subscriber: Redis;
    private matchService: MatchService;

    constructor(matchService: MatchService) {
        this.matchService = matchService;
        
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
            await this.subscriber.subscribe(REDIS_CHANNELS.EVENTS);
            
            // Escuchamos mensajes
            this.subscriber.on('message', (channel, message) => {
                if (channel === REDIS_CHANNELS.EVENTS) {
                    this.handleMessage(message);
                }
            });

            console.log('✅ [MatchEventSubscriber] Ready. Listening on channel:', REDIS_CHANNELS.EVENTS);
            
        } catch (error) {
            console.error('❌ [MatchEventSubscriber] Failed to subscribe:', error);
        }
    }

    private handleMessage(message: string) {
		try {
			// 1. Casteamos a SystemEvent para que TypeScript nos ayude
			const event = JSON.parse(message) as SystemEvent;
			
			// Validación defensiva básica
			if (!event || !event.type) return;

        switch (event.type) {
                // CASO 1: Desconexión (limpia colas, cancela pending matches)
			case REDIS_CHANNELS.USER_DISCONNECTED:
				// TypeScript sabe que 'event' es UserDisconnectedEvent aquí
				// Usamos targetUserId que es el estándar definido en BaseEvent
				const disconnectedId = event.targetUserId;

                if (disconnectedId) {
                     console.log(`⚡ [MatchEventSubscriber] Handling disconnect for: ${disconnectedId}`);
                    
                    // 2. Ejecución Paralela y Resiliente
	                // Ejecutamos ambas limpiezas. Si una falla, la otra sigue.
                    Promise.allSettled([
                        this.matchService.leavePublicQueue(disconnectedId),
                        this.matchService.cancelPendingMatches(disconnectedId)
                    ]).then((results) => {
                        // Log opcional para depuración
                        results.forEach((result, index) => {
                            if (result.status === 'rejected') {
                                console.error(`❌ Cleanup task ${index} failed for ${disconnectedId}:`, result.reason);
                            }
                        });
                    });
                }
                break;
			
			
                // CASO 2: Actualización de Perfil (NUEVO)
                case REDIS_CHANNELS.USER_PROFILE_UPDATED:
                    // Asegúrate de que el payload traiga userId y el nuevo username
                    // Estructura esperada: { type: '...', payload: { userId: '123', username: 'NewName' } }
                    const { userId, username } = event.payload || {}; 
                    
                    if (userId && username) {
                        console.log(`📝 [Subscriber] Profile update received for ${userId}`);
                        this.matchService.handleUsernameChange(userId, username)
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