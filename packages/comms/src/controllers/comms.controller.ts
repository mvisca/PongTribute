import type { FastifyRequest, FastifyReply } from 'fastify';
import type { WebSocket } from 'ws';
import type { Redis } from 'ioredis';
import { CommsService } from '../services/comms.service.js';

interface HealthCheckDependency {
	status: string;
	error?: string;
}

interface HealthCheckResponse {
	status: 'ok' | 'degraded';
	service: string;
	timestamp: string;
	uptime: number;
	dependencies: Record<string, HealthCheckDependency>;
}

/**
* Controller para manejar las peticiones del servicio de comunicaciones
*/
export class CommsController {
	private service: CommsService;
	private redisClient: Redis | null;
	
	constructor(service: CommsService, redisClient: Redis | null = null) {
		this.service = service;
		this.redisClient = redisClient;
	}
	
	/**
	* Maneja la conexión WebSocket entrante
	*/
	handleWebSocketConnection(socket: WebSocket, request: FastifyRequest): void {
		if (!this.service) {
			socket.close(1011, 'Service not available');
			return;
		}
		
		this.service.handleConnection(socket, request);
	}
	
	/**
	* Maneja el health check del servicio
	*/
	async handleHealthCheck(request: FastifyRequest, reply: FastifyReply): Promise<HealthCheckResponse> {
		const checks: Record<string, HealthCheckDependency> = {};
		let allHealthy = true;
		
		// Check Redis connection
		if (this.redisClient) {
			try {
				const redisStatus = await this.redisClient.ping();
				checks.redis = { status: redisStatus === 'PONG' ? 'ok' : 'unhealthy' };
				if (redisStatus !== 'PONG') allHealthy = false;
			} catch (error: any) {
				checks.redis = { status: 'unreachable', error: error.message };
				allHealthy = false;
			}
		} else {
			checks.redis = { status: 'not_initialized', error: 'Redis client not initialized' };
			allHealthy = false;
		}
		
		const statusCode = allHealthy ? 200 : 503;
		reply.status(statusCode);
		
		if (allHealthy) {
			console.log('[COMMS] Health check ok!');
		} else {
			console.warn('[COMMS] Health check degraded!', checks);
		}
		
		return {
			status: allHealthy ? 'ok' : 'degraded',
			service: 'COMMS',
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			dependencies: checks
		};
	}
}
