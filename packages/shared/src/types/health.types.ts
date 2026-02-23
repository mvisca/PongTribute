/**
 * Tipos compartidos para health checks de todos los servicios.
 * Contrato uniforme: cada servicio responde con la misma estructura.
 */

export interface HealthCheckDependency {
	status: string;
	error?: string;
}

export interface HealthCheckResponse {
	status: 'ok' | 'degraded';
	service: string;
	timestamp: string;
	uptime: number;
	dependencies: Record<string, HealthCheckDependency>;
}