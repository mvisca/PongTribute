import { WebSocket } from "http";
import { Redis } from 'ioredis';
import jwt from 'jsonwebtoken';
import { CommsEnv } from '../config.js';
import type { FastifyRequest } from "fastify";
import { EVENT_HANDLERS } from './events/index.js';

// ============================================================================
// TYPES
// ============================================================================

interface JWTPayload {
	id: string;
	username: string;
	email: string;
}

interface RedisEvent {
	type: 'user:login' | 'user:logout';
	userId: string;
	timestamp: number;
}

interface WSMessage {
	type: string;
	payload: unknown;
}

// ============================================================================
// COMMS SERVICE
// ============================================================================

export class CommsService {
	private connections: Map<string, Set<WebSocket>> = new Map();
	private redis: Redis;
	private redisSub: Redis;
	private heartbeatInterval: NodeJS.Timeout | null = null;
	private totalConnections = 0;

	constructor() {
		this.redis = new Redis({
			host: CommsEnv.REDIS_HOST(),
			port: CommsEnv.REDIS_PORT(),
			lazyConnect: true
		}); // TODO comparar instanciación de redis con redisClient de otros servicios
	
		this.redisSub = new Redis({
			host: CommsEnv.REDIS_HOST(),
			port: CommsEnv.REDIS_PORT(),
			lazyConnect: true
		});
	}

	// ============================================================================
	// INICIALIZACIÓN
	// ============================================================================

	async init(): Promise<void> {
		await this.redis.connect();
		await this.redisSub.connect();

		// Suscribirse a eventos
		await this.redisSub.subscribe('user:login', 'user:logout');

		this.redisSub.on('message', (channel, message) => {
			this.handleRedisMessage(channel, message);
		});

		// Iniciar hearthbeat
		this.startHeartbeat();

		console.log('[Comms] Inicializado - Escuchando Redis eventos');
	}

	// Cerrar todas las conexiones
	async close(): Promise<void> {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
		}

		for (const [userId, sockets] of this.connections) {
			for (const ws of sockets) {
				ws.close(1001, 'Server shuting down');
			}
		}
		this.connections.clear();

		await this.redisSub.quit();
		await this.redis.quit();

		console.log('[Comms] Servicio cerrado');
	}

	// ==========================================================================
	// MANEJO DE CONEXIONES WS
	// ==========================================================================

	async handleConnection(ws: WebSocket, req: FastifyRequest): Promise<void> {
		const query = req.query as { token?: string };
		const { token } = query;

		// Validar token
		if (!token) {
			ws.close(1008, 'Invalid token');
			return;
		}

		
	}

}