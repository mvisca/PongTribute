import { Redis } from 'ioredis';
import jwt from 'jsonwebtoken';
import { WebSocket } from "ws";
import type { FastifyRequest } from "fastify";
import { CommsEnv } from '../config.js';
import { EVENT_HANDLERS } from './events/index.js';

// ============================================================================
// TYPES
// ============================================================================

interface JWTPayload {
	id: string;
	username: string;
	email: string;
}

interface WSMessage {
	type: string; // TODO reemplazar por tipo union literal que asimile nuevos tipos
	payload?: unknown;
	timestamp: number;
}

interface ExtendedWebSocket extends WebSocket {
	isAlive?: boolean;
	userId?: string;
}

// ============================================================================
// COMMS SERVICE
// ============================================================================

export class CommsService {
	private connections: Map<string, Set<ExtendedWebSocket>> = new Map();
	private redis: Redis;
	private redisSub: Redis;
	private heartbeatInterval: NodeJS.Timeout | null = null;
	private totalConnections = 0;
	private logger = console; // TODO integrar loger real

	constructor() {
		this.redis = new Redis({
			host: CommsEnv.REDIS_HOST(),
			port: CommsEnv.REDIS_PORT(),
			lazyConnect: true,
			retryStrategy: (times) => Math.min(times * 50, 2000),
			maxRetriesPerRequest: 3
		}); // TODO comparar instanciación de redis con redisClient de otros servicios
	
		this.redisSub = new Redis({
			host: CommsEnv.REDIS_HOST(),
			port: CommsEnv.REDIS_PORT(),
			lazyConnect: true,
			retryStrategy: (times) => Math.min(times * 50, 2000)
		});
	}

	// ============================================================================
	// COMMS SERVICE
	// ============================================================================

	private validateConnectionLimits(userId: string): boolean {
		const max = CommsEnv.WS_MAX_CONNECTIONS_PER_USER();
		const current = this.connections.get(userId)?.size || 0;

		if (current >= max) {
			console.warn(`[Comms] Límite de conexiones alcanzado para ${userId}`);
			return false;
		}

		const globalMax = CommsEnv.WS_MAX_CONNECTIONS();
		if (this.totalConnections >= globalMax) {
			this.logger.warn(`[Comms] Límite global alcanzado (${this.totalConnections}/${globalMax})`);
			return false;
		}

		return true;
	}

	private validateGlobalConnections(): boolean { // TODO no se usa??
		const max = CommsEnv.WS_MAX_CONNECTIONS();

		if (this.totalConnections >= max) {
			console.warn(`[Comms] Límite global de conexiones alcanzado`);
			return false;
		}
		return true;
	}

	// ============================================================================
	// INICIALIZACIÓN
	// ============================================================================

	async init(): Promise<void> {
		this.logger.log('[Comms] Comenznado inicialización del servicio.');
	
		try {
			await this.redis.connect();
			await this.redisSub.connect(); // TODO una nueva instancia o duplicate() ??
			this.logger.log('[Comms] Redis conectado');
			
			// Suscribirse a eventos
			await this.redisSub.subscribe('user:login', 'user:logout');
			this.logger.log('[Comms] Suscrito a user:login, user:logout');
			
			this.redisSub.on('message', (channel, message) => {
				this.handleRedisMessage(channel, message).catch((err) => {
					this.logger.error('[Comms] Error en handleRedisMessage', err);
				});
			});
			
			// Iniciar hearthbeat
			this.startHeartbeat();
			this.logger.log('[Comms] Heartbeat iniciado');

			this.logger.log('[Comms] Servicio inicializado completamente.');

		} catch (err) {
			this.logger.error('[Comms] Error en init', err);
			throw err;
		}
	}

	// Cerrar todas las conexiones
	async close(): Promise<void> {

		// Parar heartbeat
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
		}

		// Cerrar todas las conexiones a WebSocket
		for (const [userId, sockets] of this.connections) {
			for (const ws of sockets) {
				try {
					ws.close(1001, 'Server shuting down');
				} catch(err) {
					this.logger.error(`Error cerrando socket de ${userId}`);
				}
			}
		}
		this.connections.clear();

		try {
			await this.redisSub.unsubscribe();
			await this.redisSub.quit();
			await this.redis.quit();
		} catch(err) {
			this.logger.log('[Comms] Error desconectando Redis');
		}

		console.log('[Comms] Servicio cerrado');
	}

	// ==========================================================================
	// ENVÍO DE MENSAJES
	// ==========================================================================
	
	// HEARTBEAT

	private startHeartbeat(): void {
		this.heartbeatInterval = setInterval(() => {

			for (const [userId, sockets] of this.connections) {
				for (const ws of sockets) {
					// Si no respondió el ping anterior, terminar conexión
					if ((ws as any).isAlive === false) {
						console.log(`[Comms] Cerrando conexión inactiva: ${userId}`);
						ws.terminate();
						continue;
					}

					// Marcar no confirmado y enviar ping
					ws.isAlive = false;
					ws.ping();

					// Set timeout, si no recibe pong en x ms, cerrar
					setTimeout(() => {
						if (!ws.isAlive && ws.readyState === WebSocket.OPEN) {
							ws.close(1000, 'Pong timeout');
						}
					}, CommsEnv.WS_PONG_TIMEOUT_MS());
				}
			}
		}, CommsEnv.WS_PING_INTERVAL_MS());
	}

	// MENSAJES PARA USUARIO ESPECÍFICO
	
	public sendToUser(
		userId: string,
		message: any
	): boolean {
		const sockets = this.connections.get(userId);

		if (!sockets || sockets.size === 0) {
			this.logger.warn(`[Coms] Usuario no conectado: ${userId}`);
			return false;
		}

		const messageStr = JSON.stringify(message);
		let sentCount = 0;

		// Se envía a todos los ws del cliente
		for (const ws of sockets) { // DUDA como habrá solo una sesion, será imposible más de un ws de todos modos
			if (ws.readyState === WebSocket.OPEN) {
				try {

					ws.send(messageStr);
					sentCount++;
				} catch (err) {
					this.logger.error(`Error enviando a socket de ${userId}:`, err);
				}
			}
		}

		if (sentCount === 0) {
			console.warn(`[Comms] No se pudieron enviar mensajes a ${userId}`);
			return false;
		}

		console.log(`[Comms] Mensaje enviado a ${userId} (${sentCount} sockets)`);
		return true;
	}

	// BROADCAST

	public broadcastToUsers(
		userIds: string[],
		message: any
	): void {
		for (const userId of userIds) {
			this.sendToUser(userId, message);
		}
	}

	public broadcast(message: any, excludedUserId?: string): void {
		const messageStr = JSON.stringify(message);

		for (const [userId, sockets] of this.connections) {
			if (excludedUserId === userId) continue;

			for (const ws of sockets) {
				if (ws.readyState === WebSocket.OPEN) {
					try {
						ws.send(messageStr);
					} catch (err) {
						this.logger.error(`Error en broadcast a ${userId}:`, err);
					}
				}
			}
		}
		this.logger.log(`[Comms] Broadcast enviado (excluyendo ${excludedUserId || 'nadie'})`);
	}

	// MANEJO DE MENSAJE DE REDIS

	public async handleRedisMessage(
		channel: string,
		messageStr: string
	): Promise<void> {
		try {
			const event = JSON.parse(messageStr);

			this.logger.log(`[Comms] Redis evento recibido:`, { channel, type: event.type });

			// Buscar handler para este canal
			for (const handler of EVENT_HANDLERS) {
				if (handler.channels.includes(channel)) {
					await handler.handle(event, this);
					return;
				}
			}

			this.logger.warn(`[Comms] Sin handler para el canal: ${channel}`);

		} catch (err) {
			console.error(`[Comms] Error procesando evento handleRedisMessage:`, err);
		}
	}

	// MANEJO D MENSAJES

	private async handleMessage(
		ws: ExtendedWebSocket,
		messageStr: string
	): Promise<void> {
		try {
			const message = JSON.parse(messageStr) as WSMessage;
			const userId = ws.userId;

			this.logger.log(`[Comms] Mensaje de ${userId}: ${message.type}`);

			switch (message.type) {
				case 'ping':
					ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
					break;

				case 'message':
					// TODO implementar mensajes e2e
				
				default:
					this.logger.warn(`[Comms] Tipo desconocido de evento: ${message.type}`);
			}
		
		} catch (err) {
			this.logger.error(`[Comms] Error parseando mensaje:`, err);
			ws.send(JSON.stringify({
				type: 'error',
				payload: { message: 'Tipo de mensaje inválido' }
			}));
		}
	}

	// ==========================================================================
	// MANEJO DE CONEXIONES WS
	// ==========================================================================
	
	async handleConnection(
		ws: ExtendedWebSocket,
		req: FastifyRequest
	): Promise<void> {
		try {
			const query = req.query as { token?: string };
			const { token } = query;
			
			// Validar token
			if (!token) {
				ws.close(1008, 'No token provided');
				return;
			}
			
			// Verificar JWT
			let payload: JWTPayload;
			try {
				payload = jwt.verify(token, CommsEnv.JWT_SECRET()) as JWTPayload;
			} catch(err) {
				ws.close(1008, 'Invalid token');
				return;
			}

			const userId = payload.id;

			// Validar límites de conexión
			if (!this.validateConnectionLimits(userId)) {
				ws.close(1008, 'Too many connections');
				return;
			}

			// Almacenar conexión
			if (!this.connections.has(userId)) {
				this.connections.set(userId, new Set());
			}
			this.connections.get(userId)!.add(ws);
			this.totalConnections++;

			// Marcar como viva
			ws.isAlive = true;
			ws.userId = userId;

			this.logger.log(`[Comms] Nuevo cliente conectado: ${userId} (Total: ${this.totalConnections})`);

			// Handlers de eventos
			ws.on('message', (data) => {
				this.handleMessage(ws, data.toString()).catch((err) => {
					this.logger.error(`Error procesando mensaje de ${userId}:`, err);
				});
			});

			ws.on('pong', () => {
				ws.isAlive = true;
			});

			ws.on('close', () => {
				this.handleDisconnect(ws, userId);
			});

			ws.on('error', (err) => {
				this.logger.error('[Comms] Error en el handleConnection:', err);
				ws.close(1011, 'Internal server error');
			});

		} catch (err) {
			this.logger.error('[Comms] Error en handleConnection:', err);
			ws.close(1011, 'Internal server error');
		}
	}

	private handleDisconnect(ws: ExtendedWebSocket, userId: string): void {
		try {
			const sockets = this.connections.get(userId);
			if (!sockets) return;

			sockets.delete(ws);
			this.totalConnections--;

			if (sockets.size === 0) {
				this.connections.delete(userId);
				this.logger.log(`[Comms] Usuario desconectaro: ${userId}`);
			} else {
				this.logger.log(
					`[Comms] Socket cerrado de ${userId} (Quedan: ${sockets.size})`
				);
			}

			this.logger.log(`[Comms] Total de conexiones activas: ${this.totalConnections}`);
		} catch(err) {

		}

	}

	// ==========================================================================
	// STATS
	// ==========================================================================

	public getStats() {
		return {
			totalConnections: this.totalConnections,
			activeUsers: this.connections.size,
			timestamp: new Date().toISOString(),
			connections: Array.from(this.connections.entries()).map(
				([userId, sockets]) => ({
					userId,
					socketCount: sockets.size
				})
			)
		};
	}

}