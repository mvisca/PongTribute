import type { Redis } from 'ioredis';
import { WebSocket } from "ws";
import type { FastifyRequest } from "fastify";
import { CommsEnv } from '../config.js';
import { EVENT_HANDLERS } from './events/index.js';
import {
	AuthTypes,
	CommsTypes,
	IEventService,
	TranscendenceEventsTypes,
	WebSocketEventsTypes,
	TRANSCENDENCE_EVENTS,
	TRANSCENDENCE_CHANNEL,
	UserTypes
} from '@transcendence/shared';
import { createLogger, type AppLogger } from '@transcendence/shared';

// ============================================================================
// TYPES (Solo específicos de backend)
// ============================================================================

interface ExtendedWebSocket extends WebSocket {
	isAlive: boolean;
	userId: string;
}

// ============================================================================
// COMMS SERVICE
// ============================================================================

export class CommsService implements IEventService {
	// Mapa: UserId -> Set de Sockets (Soporte multi-pestaña/dispositivo)
	private connections: Map<string, Set<ExtendedWebSocket>> = new Map();
	
	// Constantes de classe
	private readonly MAX_MESSAGE_SIZE_BYTES = 4_096;   // 4 KB
	private readonly MAX_MESSAGES_PER_SECOND = 10;
	
	/*
	Clientes Redis:
	Uno para manejo de comandos redis
	Otro para subscripciones a eventos TRANSCENDENCE_EVENTS
	
	ARCHITECTURE:
	Necesita un cliente dedicado para subscribe (no puede hacer otros comandos, sería bloqueante)
	- redis: para comandos (set, get, publish, etc)
	- redisSub: solo suscripción y recepción de mensaje
	FLOW:
	1. init: conecta redisSub y se suscibe a TRANSCENDENCE_EVENTS
	2. on message: parse evento, encuentra el handler apropiado
	3. dispatch: handler procesa y envía mensaje por websocket a usuarios
	4. cleanup: desconecta redisSub en graceful shutdown

	PHASES:
	- suscripción: await redisSub.subscribe(TRANSCENDENCE_EVENTS)
	- escucha: redisSub.on('message', (channel, message) => ...)
	- dispatch: EVENT_HANDLERS,find(h => h.event.indludes(event.type))
	*/
	private redis: Redis;
	private redisSub: Redis;
	
	/**
	 * Intervalo de heartbeat para mantener conexión Redis viva
	 * NodeJS.Timeout es el tipo que retorna  setInterval() en Node.js (en browser retorna number)
	 * 
	 * Se usa en clearInterval(this.heartbeatInterval) para limpiarlo
	 */
	private heartbeatInterval: NodeJS.Timeout | null = null;
	private totalConnections = 0;
	private log: AppLogger = createLogger('CommsService');

	constructor(redis: Redis, redisSub: Redis) {
		this.redis = redis;
		this.redisSub = redisSub;
	}	
	
	// ============================================================================
	// INICIALIZACIÓN
	// ============================================================================
	
	async init(): Promise<void> {
		this.log.info('Comenzando inicialización del servicio...');
		
		try {
			// Conexión paralela
			await Promise.all([
				this.redis.connect(),
				this.redisSub.connect() // Por tener en config lazyConnect: true, se conectarán recién ahora
			]);
			this.log.info('Clientes Redis conectados');
			
			// Suscribirse a canal de aplicacion.
			// Se filtrará por eventType
			await this.redisSub.subscribe(TRANSCENDENCE_CHANNEL);
			this.log.info({ channel: TRANSCENDENCE_CHANNEL }, 'Subscribed to channel');
			
			// Listener de mensajes Redis
			this.redisSub.on('message', (_channel, message) => {
				this.handleRedisMessage(message).catch((err) => {
					this.log.error({ err }, 'CRITIC Error in handleRedisMessage');
				});
			});

			// Heartbeat: proceso recurrente via setInterval (cada WS_PING_INTERVAL_MS)
			// Cada ciclo envía ping a todos los sockets. 
			// Si no responden pong antes del siguiente ciclo, se considera zombie y se termina la conexión.
			this.startHeartbeat();
			this.log.info('Service completely initialized and listen to.');
			
		} catch (err) {
			this.log.error('FATAL Error in init');
			throw err; // El proceso debe morir si no puede conectar a Redis
		}
	}
	
	// GRACEFUL SHUTDOWN
	async close(): Promise<void> {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
		}
		
		this.log.info('Cerrando conexiones WS...');
		for (const [userId, sockets] of this.connections) {
			for (const ws of sockets) {
				try {
					ws.close(1001, 'Servidor reiniciando/apagando');
					this.log.info({ userId }, 'Closed WebSocket for');
				} catch(err) {
					this.log.warn({ userId }, 'Failed closing websocket');
					// Ignorar errores de cierre
				}
			}
		}
		this.connections.clear();
		
		try {
			await this.redisSub.unsubscribe();
			await this.redisSub.quit();
			await this.redis.quit();
			this.log.info('Redis desconectado');
		} catch(err) {
			this.log.error({ err }, 'Error closing Redis');
		}
	}
	
	// ==========================================================================
	// SALUD DEL WEBSOCKET
	// ==========================================================================
	
	// HEARTBEAT (Keep-Alive)
	private startHeartbeat(): void {
		this.heartbeatInterval = setInterval(() => {
			this.connections.forEach((sockets, userId) => {
				sockets.forEach((ws) => {
					// Clean closed ws before trying ping
					if (ws.readyState !== WebSocket.OPEN && ws.readyState !== WebSocket.CONNECTING) {
						this.log.info({ userId }, 'Removing closed connection in heartbeat');
						this.handleDisconnect(ws, userId);
						ws.terminate();
						return;
					}
					// Kill zombies
					if (ws.isAlive === false) {
						this.log.info({ userId }, 'Terminanting zombie connection');
						this.handleDisconnect(ws, userId);
						ws.terminate();
						return;
					}
					
					ws.isAlive = false; // Set as pending 
					ws.ping(); // Sends ping only if ws is OPEN
				});
			});
		}, CommsEnv.WS_PING_INTERVAL_MS());
	}
	
	// ==========================================================================
	// ENVIO DE MENSAJES
	// ==========================================================================
	
	// ENVIAR A UN USUARIO ESPECÍFICO
	public sendToUser(userId: string, message: any): boolean {
		const sockets = this.connections.get(userId);
		
		if (!sockets || sockets.size === 0) return false;
		
		const messageStr = JSON.stringify(message);
		let sentCount = 0;
		
		sockets.forEach((ws) => {
			if (ws.readyState === WebSocket.OPEN) {
				ws.send(messageStr, (err) => {
					if (err)
						this.log.error({ err, userId }, 'Error sending message');
				});
				sentCount++;
			}
		});
		
		return sentCount > 0;
	}
	
	// BROADCAST A LISTA DE USUARIOS
	public async broadcastToUsers(
		userIds: UserTypes.UserId[],
		message: WebSocketEventsTypes.AnyWsMessage
	): Promise<void> {
		userIds.forEach(userId => this.sendToUser(userId, message));
	}
	
	// BROADCAST GLOBAL
	public broadcast(
		message: WebSocketEventsTypes.AnyWsMessage,
		excludedUserId?: UserTypes.UserId
	): void {	
		const messageStr = JSON.stringify(message);
		
		this.connections.forEach((sockets, userId) => {
			if (userId === excludedUserId) return;
			
			sockets.forEach((ws) => {
				if (ws.readyState === WebSocket.OPEN) {
					ws.send(messageStr);
				}
			});
		});
	}
	
	// ==========================================================================
	// CIERRE DE CONEXION
	// ==========================================================================
	
	public async closeUserConnection(userId: UserTypes.UserId): Promise<void> {
		const sockets = this.connections.get(userId);
		if (!sockets || sockets.size === 0) return;

		this.log.info({ userId, count: sockets.size }, 'Closing all user connections (logout)');

		// Terminate each socket and clean
		sockets.forEach(ws => {
			try {
				if (ws.readyState === WebSocket.OPEN) {
					ws.close(1008, 'Session closed on logout');
				}
			} catch (err) {
				this.log.warn({ err }, 'Error closing socket gracefully');
			}

			// Force terminate even if client is gone
			ws.terminate();

			// Decrement counter
			this.totalConnections = Math.max(0, this.totalConnections - 1); 
		});

		// Remove from connection map
		this.connections.delete(userId);

		// Publish USER_DISCONNECTED eacceptorIdvent for game service
		const event: TranscendenceEventsTypes.UserDisconnectedEvent = {
			type: TRANSCENDENCE_EVENTS.USER_DISCONNECTED,
			timestamp: Date.now(),
			source: 'comms-service',
			targetUserId: userId,
			payload: { userId }
		};

		this.redis.publish(TRANSCENDENCE_CHANNEL, JSON.stringify(event))
			.catch(err => this.log.error({ err }, 'Error publishing USER_DISCONNECTED on logout'));
	}	
	
	// ==========================================================================
	// MANEJO DE EVENTOS (REDIS) DE OTROS SERVICIOS
	// ==========================================================================
	
	private async handleRedisMessage(
		messageStr: string
	): Promise<void> {
		try {
			// Parse con el tipo SystemEvent definido en shared
			const event = JSON.parse(messageStr) as TranscendenceEventsTypes.SystemEvent;
			
			if (!event?.type) return;

			this.log.info({ eventType: event.type }, 'Received Event');
			
			// Buscar el handler adecuado en el array de handlers importado
			// Nota: Esto asume que tenemos implementado el patrón Strategy en ./events/index.ts
			const handler = EVENT_HANDLERS.find(h => h.eventTypes.includes(event.type));
			
			if (handler) {
				await handler.handle(event, this); // Se pasa el evento y el CommsService al handler
			} else {
				this.log.warn({ eventType: event.type }, 'No handler registered');
			}
			
		} catch (err) {
			this.log.error({ err }, 'Error on Redis message processing');
		}
	}
	
	// ==========================================================================
	// MANEJO DE MENSAJES WS (INPUT 2)
	// ==========================================================================
	
	private async handleMessage(ws: ExtendedWebSocket, raw: string): Promise<void> {
		try {
			const data = JSON.parse(raw) as CommsTypes.WSMessage;
			
			// Validar estructura básica
			if (!data.type) return;
			
			switch (data.type) {
				case 'ping': {
					const pongMessage: CommsTypes.PongMessage = {
						type: 'pong',
						timestamp: Date.now()
					};
					ws.send(JSON.stringify(pongMessage));
					break;
				}
				// Aquí se añadirían más casos (ej: 'game:input')
				default:
				// Ignoramos mensajes desconocidos por seguridad
				break;
			}
		} catch (err) {
			// Malformed message — ignore silently
		}
	}
	
	// ==========================================================================
	// GESTIÓN DE CONEXIONES (Handshake)
	// ==========================================================================
	
	async handleConnection(ws: WebSocket, request: FastifyRequest): Promise<void> {
		try {
			const user = request.user as AuthTypes.AccessTokenPayload;
			
			if (!user || !user.id) {
				this.log.error('Request sin user después de middleware');
				ws.close(1011, 'Internal Error');
				return;
			}
			
			//  Clean dead sockets before verifing limits
			const existing = this.connections.get(user.id);
			if (existing) {
				for (const sock of existing) {
					if (sock.readyState !== WebSocket.OPEN && sock.readyState !== WebSocket.CONNECTING) {
						existing.delete(sock);
						this.totalConnections = Math.max(0, this.totalConnections - 1);
					}
				}
				if (existing.size === 0) {
					this.connections.delete(user.id);
				}
    		}

			if (this.totalConnections >= CommsEnv.WS_MAX_CONNECTIONS()) {
				this.log.error({ totalConnections: this.totalConnections, max: CommsEnv.WS_MAX_CONNECTIONS() }, 'Reached max server connections number');

				ws.close(1008, 'Server connection limit reached');
				return;
			}
			
			// Agrega extensiones a ws
			const extWs = ws as ExtendedWebSocket;
			extWs.isAlive = true;
			extWs.userId = user.id;
			
			// Registra conexión
			if (!this.connections.has(user.id)) {
				this.connections.set(user.id, new Set());
			}
			
			if (this.connections.get(user.id)!.size >= CommsEnv.WS_MAX_CONNECTIONS_PER_USER()) {
				this.log.error({ userId: user.id, count: this.connections.get(user.id)!.size, max: CommsEnv.WS_MAX_CONNECTIONS_PER_USER() }, 'Max user connections number reached');

				ws.close(1008, 'User connection limit reached');
				return;
			}
			
			this.connections.get(user.id)!.add(extWs);
			this.totalConnections++;
			
		const rateLimit = { count: 0, resetAt: Date.now() + 1000 };

			// Guards contra flooding y payloads gigantes.
			// Cierra con 1009 si supera MAX_MESSAGE_SIZE_BYTES (4KB).
			// Cierra con 1008 si supera MAX_MESSAGES_PER_SECOND (10 msg/s, ventana deslizante por conexión).
			extWs.on('message', (data) => {
				// Guard 1 — tamaño
				if (Buffer.byteLength(data as Buffer) > this.MAX_MESSAGE_SIZE_BYTES) {
					extWs.close(1009, 'Message too large');
					return;
				}

				// Guard 2 — frecuencia
				const now = Date.now();
				if (now > rateLimit.resetAt) {
					rateLimit.count = 0;
					rateLimit.resetAt = now + 1000;
				}
				if (++rateLimit.count > this.MAX_MESSAGES_PER_SECOND) {
					extWs.close(1008, 'Rate limit exceeded');
					return;
				}

				this.handleMessage(extWs, data.toString());
			});

			// Event listeners del socket

			extWs.on('pong', () => { extWs.isAlive = true });
			
			extWs.on('close', () => this.handleDisconnect(extWs, user.id));
			
			extWs.on('error', (err: Error) => {
				this.log.error({ userId: user.id }, 'Socket failure');
			});
		} catch (err) {
			this.log.error({ err }, 'Handshake Error');
			ws.close(1011, 'Internal Error');
		}
	}
	
	private handleDisconnect(ws: ExtendedWebSocket, userId: string): void {
		const sockets = this.connections.get(userId);

		if (!sockets || !sockets.has(ws)) return;

		if (sockets) {
			sockets.delete(ws);
			this.totalConnections--;
		}

		// Si ya no quedan sockets para este usuario, porque cerró la ultima pestaña
		if (sockets.size === 0) {
			this.connections.delete(userId); // Limpieza local

			this.log.info({ userId }, 'User fully disconnected');

			// Publicar evento para limpieza INMEDIATA en Game/User (desconexion por cierre pestaña)
			const event: TranscendenceEventsTypes.UserDisconnectedEvent = {
				type: TRANSCENDENCE_EVENTS.USER_DISCONNECTED,
				timestamp: Date.now(),
				source: 'comms-service',
				targetUserId: userId, // Esto es lo que lee Game
				payload: { userId }
			};

			// El servicio 'game' esta subscrito a esta publicacion
			this.redis.publish(TRANSCENDENCE_CHANNEL, JSON.stringify(event))
				.catch(err => this.log.error({ err }, 'Error publishing disconnected event'));
		}
	}
	
	// STATS
	public getStats() {
		return {
			totalConnections: this.totalConnections,
			activeUsers: this.connections.size,
			timestamp: new Date().toISOString()
		};
	}

	// REDIS CLIENT GETTER (for health checks)
	public getRedisClient(): Redis {
		return this.redis;
	}
}