import type { FastifyRequest, FastifyReply } from 'fastify';
import type { HealthCheckDependency, HealthCheckResponse } from '@transcendence/shared';
import { GatewayEnv } from '../config.js';

/**
 * Controller para manejar el health check del gateway
 */
export class HealthController {
	/**
	 * Helper para hacer fetch con timeout
	 */
	private async fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), timeoutMs);
		try {
			const response = await fetch(url, { signal: controller.signal });
			clearTimeout(timeout);
			return response;
		} catch (error) {
			clearTimeout(timeout);
			throw error;
		}
	}

	/**
	 * Maneja el health check del gateway verificando servicios upstream
	 */
	async handleHealthCheck(request: FastifyRequest, reply: FastifyReply): Promise<HealthCheckResponse> {
		const checks: Record<string, HealthCheckDependency> = {};
		let allHealthy = true;

		// Verificar AUTH service
		try {
			const authResponse = await this.fetchWithTimeout(`${GatewayEnv.AUTH_SERVICE_URL}/health`, 3000);
			checks.auth = { status: authResponse.ok ? 'ok' : 'unhealthy' };
			if (!authResponse.ok) allHealthy = false;
		} catch (error: any) {
			checks.auth = { status: 'unreachable', error: error.message };
			allHealthy = false;
		}

		// Verificar USER service
		try {
			const userResponse = await this.fetchWithTimeout(`${GatewayEnv.USER_SERVICE_URL}/health`, 3000);
			checks.user = { status: userResponse.ok ? 'ok' : 'unhealthy' };
			if (!userResponse.ok) allHealthy = false;
		} catch (error: any) {
			checks.user = { status: 'unreachable', error: error.message };
			allHealthy = false;
		}

		// Verificar GAME service
		try {
			const gameResponse = await this.fetchWithTimeout(`${GatewayEnv.GAME_SERVICE_URL}/health`, 3000);
			checks.game = { status: gameResponse.ok ? 'ok' : 'unhealthy' };
			if (!gameResponse.ok) allHealthy = false;
		} catch (error: any) {
			checks.game = { status: 'unreachable', error: error.message };
			allHealthy = false;
		}

		const statusCode = allHealthy ? 200 : 503;
		reply.status(statusCode);

		return {
			status: allHealthy ? 'ok' : 'degraded',
			service: 'GATEWAY',
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			dependencies: checks
		};
	}
}
