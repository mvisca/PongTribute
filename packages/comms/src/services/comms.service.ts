import { Redis } from 'ioredis';
import jwt from 'jsonwebtoken';
import { WebSocket } from "ws";
import type { FastifyRequest } from "fastify";
import { CommsEnv } from '../config.js';
import { EVENT_HANDLERS } from './events/index.js';
import {  // TODO auditar estructura y arquitectura de tipos y schemas para eventos
	REDIS_CHANNELS, 
	SystemEvent,
	RedisChannelType,
	Utils, 
	REDIS_DEFAULTS
} from '@transcendence/shared';


// ============================================================================
// TYPES (Locales para WS, podrían ir a shared si el front los comparte)
// ============================================================================

interface JWTPayload {
	id: string;
	username: string;
	email: string;
}

// WS Message Types
type WSMessageType = 'ping' | 'pong' | 'message' | 'error';

interface WSMessage {
	type: WSMessageType;
	payload?: unknown;
	timestamp?: number;
}

interface ExtendedWebSocket extends WebSocket {
	isAlive: boolean;
	userId: string;
}

// ============================================================================
// COMMS SERVICE
// ============================================================================

export class CommsService {
	// Mapa: UserId -> Set de Sockets (Soporte multi-pestaña/dispositivo)
	private connections: Map<string, Set<ExtendedWebSocket>> = new Map();
	
	// Cliente para comandos (SET, GET, PUBLISH)
	private redis: Redis;
	
	// Cliente exclusivo para SUSCRIBER (SUBSCRIBE, ON MESSAGE) // TODO explicar tdlr la logica de subscripcion, fases, metodos, flujo
	private redisSub: Redis;
	
	private heartbeatInterval: NodeJS.Timeout | null = null; // TODO explciar que es este tipo?
	private totalConnections = 0;
	private logger = console;
	
	constructor() {
		// 1. Configuración base desde variables de entorno
		const redisConfig = {
			host: CommsEnv.REDIS_HOST(), // TODO para qué se crean estas variables? es mejor que crear el objeto directamente cuando se necesita?
			port: CommsEnv.REDIS_PORT(),
			lazyConnect: true, // Importante para que no conecte hasta llamar a init()
		};
		
		// 2. Cliente Estándar (Comandos / Publicar)
		// Utils validará la config y atachará los logs de conexión
		this.redis = Utils.createRedisClient(redisConfig);
		
		// 3. Cliente Suscriptor (Escuchar)
		// Instanciamos uno nuevo usando la factoría para tener también logs en este canal
		this.redisSub = Utils.createRedisClient(redisConfig);  // TODO no es mejor usar duplicate() ??
	}
	
	// TODO preguntarme cuando hacerlo, pero quiero investigar todo el flujo y arquitectura del servicio redis, sus intancias en servicios. tarea debe quedar fuera del flujo de refactorizacion en base a resolucion de "TODOs".
	
	// ============================================================================
	// VALIDACIONES INTERNAS
	// ============================================================================
	
	private validateConnectionLimits(userId: string): boolean {
		const maxPerUser = CommsEnv.WS_MAX_CONNECTIONS_PER_USER();
		const current = this.connections.get(userId)?.size || 0;
		
		if (current >= maxPerUser) {
			this.logger.warn(`[Comms] Límite por usuario alcanzado para ${userId}`);
			return false;
		}
		
		const globalMax = CommsEnv.WS_MAX_CONNECTIONS();
		if (this.totalConnections >= globalMax) {
			this.logger.warn(`[Comms] Límite global alcanzado (${this.totalConnections}/${globalMax})`);
			return false;
		}
		
		return true;
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
				this.redisSub.connect()
			]);
			this.logger.log('[Comms] Clientes Redis conectados');
			
			// Suscribirse a canales definidos en Shared
			const channelsToSubscribe = [
				REDIS_CHANNELS.USER_LOGIN,
				REDIS_CHANNELS.USER_LOGOUT,
				REDIS_CHANNELS.GAME_UPDATE
				// Añadir más canales según sea necesario
				// TODO que está haciendo exactamente el subscribe. como filtra eventos emitidos por redis. resdis no los envia a quien no suscribe o quien no suscribe los ignora.
			];
			
			await this.redisSub.subscribe(...channelsToSubscribe);
			this.logger.log(`[Comms] Suscrito a canales:\n${channelsToSubscribe.join(',\n')}\n`);
			
			// Listener de mensajes Redis
			this.redisSub.on('message', (channel, message) => {
				this.handleRedisMessage(channel as RedisChannelType, message).catch((err) => {
					this.logger.error('[Comms] Error crítico en handleRedisMessage', err);
				});
			});
			
			// Iniciar Heartbeat para mantener WS vivos
			this.startHeartbeat(); // TODO explicar como funciona el heartbet, esta llamada es un proceso recurrente o puntual?
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
						return ws.terminate();
					}
					
					ws.isAlive = false; // Marcar como pendiente
					ws.ping(); // Enviar ping
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
	public broadcastToUsers(userIds: string[], message: any): void {
		userIds.forEach(userId => this.sendToUser(userId, message));
	}
	
	// BROADCAST GLOBAL
	public broadcast(message: any, excludedUserId?: string): void {
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

	public closeUserConnection(userId: string) {
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
		channel: RedisChannelType,
		messageStr: string
	): Promise<void> {
		try {
			// Parse con el tipo SystemEvent definido en shared
			const event = JSON.parse(messageStr) as SystemEvent;

			this.logger.log(`[Comms] Evento Redis recibido: ${event.type} (Source: ${event.source})`);
			
			// Buscar el handler adecuado en el array de handlers importado
			// Nota: Esto asume que tienes implementado el patrón Strategy en ./events/index.ts
			const handler = EVENT_HANDLERS.find(h => h.channels.includes(channel));
			
			if (handler) {
				await handler.handle(event, this);
			} else {
				this.logger.warn(`[Comms] No hay handler registrado para el canal: ${channel}`);
			}
			
		} catch (err) {
			this.logger.error(`[Comms] Error procesando mensaje Redis en ${channel}:`, err);
		}
	}
	
	// ==========================================================================
	// MANEJO DE MENSAJES WS (INPUT 2)
	// ==========================================================================
	
	private async handleMessage(ws: ExtendedWebSocket, raw: string): Promise<void> {
		try {
			const data = JSON.parse(raw) as WSMessage;
			
			// Validar estructura básica
			if (!data.type) return;
			
			switch (data.type) {
				case 'ping':
				ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
				break;
				// Aquí se añadirían más casos (ej: 'game:input')
				default:
				// Ignoramos mensajes desconocidos por seguridad
				break;
			}
		} catch (err) {
			// Mensaje mal formado, ignorar
		}
	}
	
	// ==========================================================================
	// GESTIÓN DE CONEXIONES (Handshake)
	// ==========================================================================
	
	async handleConnection(ws: WebSocket, request: FastifyRequest): Promise<void> {
		try {
			const user = request.user as JWTPayload;
			
			if (!user || !user.id) {
				this.logger.error(`[Comms] Request sin user después de middleware`);
				ws.close(1011, 'Internal Error');
				return;
			}
			
			if (this.totalConnections >= CommsEnv.WS_MAX_CONNECTIONS()) {
				this.logger.error(`[Comms] Máximo número de conexiones del servidor alcanzado`);
				ws.close(1009, 'Conexión cerrada por servidor');
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
			}

			this.connections.get(user.id)!.add(extWs);
			this.totalConnections++;


			
			// Event listeners del socket
			extWs.on('message', (data) => { this.handleMessage(extWs, data.toString());	});
			
			extWs.on('pong', () => { extWs.isAlive = true });
			
			extWs.on('close', () => this.handleDisconnect(extWs, user.id));
			
			extWs.on('error', (err: Error) => { // TODO es esta la mejor inferencia de tipo?
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
}