import { Redis } from 'ioredis';
import { WebSocket } from "ws";
import type { FastifyRequest } from "fastify";
import { CommsEnv } from '../config.js';
import { EVENT_HANDLERS } from './events/index.js';
import {
	Utils,
	AuthTypes,
	CommsTypes,
	IEventService,
	TranscendenceEventsTypes,
	WebSocketEventsTypes,
	REDIS_CHANNEL,
	TRANSCENDENCE_EVENTS,
	UserTypes
} from '@transcendence/shared';


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
	private logger = console;

	constructor() {
		// 1. Configuración base desde variables de entorno
		const redisConfig = {
			host: CommsEnv.REDIS_HOST(),
			port: CommsEnv.REDIS_PORT(),
			lazyConnect: true, // Importante para que no conecte hasta llamar a init()
		};
		
		// 2. Cliente Estándar (Comandos / Publicar)
		// Utils validará la config y realizará los logs de conexión
		this.redis = Utils.createRedisClient(redisConfig);
		
		// 3. Cliente Suscriptor (Escuchar)
		// Instanciamos un duplicado del anterior, forma más eficiente que crear otra instancia
		this.redisSub = this.redis.duplicate();
	}	
	
	// ============================================================================
	// INICIALIZACIÓN
	// ============================================================================
	
	async init(): Promise<void> {
		this.logger.log('[Comms] Comenzando inicialización del servicio...');
		
		try {
			// Conexión paralela
			await Promise.all([
				this.redis.connect(),
				this.redisSub.connect() // Por tener en config lazyConnect: true, se conectarán recién ahora
			]);
			this.logger.log('[Comms] Clientes Redis conectados');
			
			// Suscribirse a canale de applicacion.
			// Se filtratá por eventType
			await this.redisSub.subscribe(REDIS_CHANNEL);
			this.logger.log(`[Comms] Suscrito a ${REDIS_CHANNEL}\n`);
			
			// Listener de mensajes Redis
			this.redisSub.on('message', (channel, message) => {
				this.handleRedisMessage(channel, message).catch((err) => {
					this.logger.error('[Comms] Error crítico en handleRedisMessage', err);
				});
			});

			// Heartbeat: proceso recurrente via setInterval (cada WS_PING_INTERVAL_MS)
			// Cada ciclo envía ping a todos los sockets. 
			// Si no responden pong antes del siguiente ciclo, se considera zombie y se termina la conexión.
			this.startHeartbeat();
			this.logger.log('[Comms] Servicio inicializado completamente y escuchando.');
			
		} catch (err) {
			this.logger.error('[Comms] Error FATAL en init:', err);
			throw err; // El proceso debe morir si no puede conectar a Redis
		}
	}
	
	// GRACEFUL SHUTDOWN
	async close(): Promise<void> {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
		}
		
		this.logger.log('[Comms] Cerrando conexiones WS...');
		for (const [userId, sockets] of this.connections) {
			for (const ws of sockets) {
				try {
					ws.close(1001, 'Servidor reiniciando/apagando');
					this.logger.info(`Cerrado WebSocket para ${userId}, URL: ${ws.url}, Estado: ${ws.readyState}`);
				} catch(err) {
					this.logger.info(`Fallo cerrando WebSocket para ${userId}, URL: ${ws.url}, Estado: ${ws.readyState}`);
					// Ignorar errores de cierre
				}
			}
		}
		this.connections.clear();
		
		try {
			await this.redisSub.unsubscribe();
			await this.redisSub.quit();
			await this.redis.quit();
			this.logger.log('[Comms] Redis desconectado');
		} catch(err) {
			this.logger.error('[Comms] Error cerrando Redis', err);
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
					// Si ya estaba muerto en el ciclo anterior, eliminar
					if (ws.isAlive === false) {
						this.logger.log(`[Comms] Terminando conexión zombie: ${userId}`);
						this.handleDisconnect(ws, userId);
						ws.terminate();
						return;
					}

					ws.isAlive = false; // Marcar como pendiente
					ws.ping(); // Enviar ping, es síncrono, a diferencia del de redis que es async
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
					if (err) this.logger.error(`[Comms] Error enviando a ${userId}:`, err);
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
		if (sockets) {
			sockets.forEach(ws => {
				ws.close(1008, 'Sesión cerrada por logout');
			});
			this.connections.delete(userId);
		}
	}	
	
	// ==========================================================================
	// MANEJO DE EVENTOS DE OTROS SERVICIOS (REDIS)
	// ==========================================================================
	
	private async handleRedisMessage(
		channel: string, // TODO actualmente no se usa, borrarlo=
		messageStr: string
	): Promise<void> {
		try {
			// Parse con el tipo SystemEvent definido en shared
			const event = JSON.parse(messageStr) as TranscendenceEventsTypes.SystemEvent;
			
			if (!event?.type) return;

			this.logger.log(`[Comms] Evento recibido: ${event.type}`);
			
			// Buscar el handler adecuado en el array de handlers importado
			// Nota: Esto asume que tienes implementado el patrón Strategy en ./events/index.ts
			const handler = EVENT_HANDLERS.find(h => h.eventTypes.includes(event.type));
			
			if (handler) {
				await handler.handle(event, this); // Se pasa el evento y el CommsService al handler
			} else {
				this.logger.warn(`[Comms] No hay handler registrado para el canal: ${event.type}`);
			}
			
		} catch (err) {
			this.logger.error(`[Comms] Error procesando mensaje Redis}:`, err);
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
			// Mensaje mal formado, ignorarU): Pr
		}
	}
	
	// ==========================================================================
	// GESTIÓN DE CONEXIONES (Handshake)
	// ==========================================================================
	
	async handleConnection(ws: WebSocket, request: FastifyRequest): Promise<void> {
		try {
			const user = request.user as AuthTypes.AccessTokenPayload;
			
			if (!user || !user.id) {
				this.logger.error(`[Comms] Request sin user después de middleware`);
				ws.close(1011, 'Internal Error');
				return;
			}
			
			if (this.totalConnections >= CommsEnv.WS_MAX_CONNECTIONS()) {
				this.logger.error(`[Comms] Máximo número de conexiones del servidor alcanzado`);
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
				this.logger.error(`[Comms] Máximo número de conexiones del usuario alcanzado`);
				ws.close(1008, 'User connection limit reached');
				return;
			}
			
			this.connections.get(user.id)!.add(extWs);
			this.totalConnections++;
			
			
			
			// Event listeners del socket
			extWs.on('message', (data) => { this.handleMessage(extWs, data.toString());	});
			
			extWs.on('pong', () => { extWs.isAlive = true });
			
			extWs.on('close', () => this.handleDisconnect(extWs, user.id));
			
			extWs.on('error', (err: Error) => {
				this.logger.error(`[Comms] Fallo en socket user ${user.id}`, err);
			});
		} catch (err) {
			this.logger.error('[Comms] Error handshake:', err);
			ws.close(1011, 'Internal Error');
		}
	}
	
	private handleDisconnect(ws: ExtendedWebSocket, userId: string): void {
		const sockets = this.connections.get(userId);
		if (sockets) {
			sockets.delete(ws);
			this.totalConnections--;
			
			if (sockets.size === 0) {
				this.connections.delete(userId);
				// Opcional: Notificar desconexión completa a otros servicios o amigos
				this.logger.log(`[Comms] Usuario ${userId} totalmente desconectado.`);
			}
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