// SUBSCRIPCION DEL SERVICIO GAME A LOS EVENTOS REDIS

import { Redis } from 'ioredis';
import { MatchService } from '../services/MatchService.js';
import { redisConstants, Utils } from '@transcendence/shared';
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
            await this.subscriber.subscribe(redisConstants.REDIS_CHANNELS.EVENTS);
            
            // Escuchamos mensajes
            this.subscriber.on('message', (channel, message) => {
                if (channel === redisConstants.REDIS_CHANNELS.EVENTS) {
                    this.handleMessage(message);
                }
            });

            console.log('✅ [MatchEventSubscriber] Ready. Listening on channel:', redisConstants.REDIS_CHANNELS.EVENTS);
            
        } catch (error) {
            console.error('❌ [MatchEventSubscriber] Failed to subscribe:', error);
        }
    }

    private handleMessage(message: string) {
        try {
			const event = JSON.parse(message);
			
			// Validación defensiva básica
			if (!event || !event.type) return;

        switch (event.type) {
                // CASO 1: Desconexión (limpia colas)
                case redisConstants.REDIS_EVENTS.USER_DISCONNECTED:
                    if (event.userId) {
                        console.log(`⚡ [MatchEventSubscriber] Disconnect: ${event.userId}`);
                        this.matchService.leavePublicQueue(event.userId)
                            .catch(err => console.error('❌ Queue cleanup error:', err));
                    }
                    break;

                // CASO 2: Actualización de Perfil (NUEVO)
                case redisConstants.REDIS_CHANNELS.USER_PROFILE_UPDATED: // <--- VERIFICA ESTE NOMBRE EN SHARED
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