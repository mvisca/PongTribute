// SUBSCRIPCION DEL SERVICIO GAME A LOS EVENTOS REDIS

import { Redis } from 'ioredis';
import { MatchService } from '../services/MatchService.js';
import { GameService } from '../services/GameService.js';
import { REDIS_CHANNELS, SystemEvent, Utils } from '@transcendence/shared';
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
        
        console.log(`🔌 [Subscriber] Configurando Redis hacia ${redisConfig.host}:${redisConfig.port}`);

        // 2. Usar la Factory de Shared (Patrón del proyecto)
        this.subscriber = Utils.createRedisClient(redisConfig);
    }

    public async connect() {
        try {
            console.log('🎧 [MatchEventSubscriber] Connecting to Pub/Sub...');

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
			if (!event || !event.type || !event.payload) return;

			switch (event.type) {
				// CASO 1: Desconexión
                case REDIS_CHANNELS.USER_DISCONNECTED: {
					// El evento UserDisconnected NO tiene userId en el payload.
                    // Lo tiene en la propiedad raíz 'targetUserId'.
					// Hacemos un cast a un tipo intersección para acceder a la propiedad sin error.
					// TypeScript no sabe que SystemEvent tiene targetUserId (porque es una unión
					//  de tipos). Con &, le decimos: "Confía en mí, este objeto es un evento 
					// Y ADEMÁS tiene targetUserId".
                    const disconnectedEvent = event as SystemEvent & { targetUserId: string };
                    const userId = disconnectedEvent.targetUserId;

                    if (userId) {
                        console.log(`⚡ [MatchEventSubscriber] User disconnect: ${userId}`);
                        
                        // Si falla uno, no detiene a los otros
                        Promise.allSettled([
                            this.matchService.leavePublicQueue(userId),
                            this.matchService.cancelPendingMatches(userId),
                            this.gameService.handleDisconnect(userId)
                        ]);
                    } else {
                        console.warn('⚠️ [MatchEventSubscriber] User disconnected event missing targetUserId', event);
                    }
                    break;
                }
                
                // CASO 2: Actualización de Perfil
                case REDIS_CHANNELS.USER_PROFILE_UPDATED: {
                    // AUDITORÍA FIX: El evento UserProfileUpdated tiene targetUserId en la raíz
                    // y el payload contiene los datos cambiados (username, avatar, etc.)
                    // Usamos SystemEvent & { targetUserId: string, payload: { username?: string } }
                    
                    const updateEvent = event as SystemEvent & { 
                        targetUserId: string; 
                        payload: { username?: string } 
                    };

                    const userId = updateEvent.targetUserId;
                    const username = updateEvent.payload?.username;
                    
                    if (userId && username) {
                        console.log(`📝 [Subscriber] Syncing profile for ${username} (${userId})`);
                        
                        // 1. Actualizar DB (Historial y registros persistentes)
                        this.matchService.handleUsernameChange(userId, username)
                            .catch(err => console.error('❌ DB Update error:', err));
                        
                        // 2. Actualizar Memoria (Sesión activa en RAM)
                        this.gameService.updatePlayerNameInActiveMatch(userId, username);
                    } else {
                         // Log de advertencia si llega el evento pero sin los datos necesarios
                         if (!username) console.warn(`⚠️ [Subscriber] Profile update for ${userId} missing username`);
                    }
                    break;
                }
            }
        } catch (error) {
            console.error('❌ Error parsing Redis message:', error);
        }
	}
	// Cierra limpiamente la conexion Redis
	public async disconnect() {
        if (this.subscriber) {
            console.log('🔌 [MatchEventSubscriber] Disconnecting...');
            await this.subscriber.quit();
        }
    }
}