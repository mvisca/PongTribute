// SUBSCRIPCION DEL SERVICIO GAME A LOS EVENTOS REDIS

import { Redis } from 'ioredis';
import { MatchService } from '../services/MatchService.js';
import { REDIS_CHANNELS, REDIS_EVENTS, Utils } from '@transcendence/shared';
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

	//OJO: de momento solo escucha un evento. REVISAR MAS ADELANTE
    private handleMessage(message: string) {
        try {
            const event = JSON.parse(message);

            // Filtramos: Solo escucha desconexiones para limpiar colas
            if (event.type === REDIS_EVENTS.USER_DISCONNECTED && event.userId) {
                console.log(`⚡ [MatchEventSubscriber] Disconnect detected for User: ${event.userId}`);
                
                // Acción: Limpiar la cola pública
                this.matchService.leavePublicQueue(event.userId)
                    .catch(err => console.error('❌ Error auto-leaving queue:', err));
            }

        } catch (error) {
            console.error('❌ Error parsing Redis message:', error);
        }
    }
}