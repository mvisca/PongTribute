// import { FastifyPluginAsync } from "fastify";
// import { HealthController } from "../controllers/health.controller.js";

// export const healthRoutes: FastifyPluginAsync = async (app) => {
// 	// Crear el controller
// 	const controller = new HealthController();

// 	/**
// 	 * Health check endpoint
// 	 */
// 	app.get('/health', async (request, reply) => {
// 		return controller.handleHealthCheck(request, reply);
// 	});
// };

//Simplificado a un "Liveness Check" para permitir el arranque fluido
import { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (app) => {
    
	// GET /health
    // Liveness Probe: Responde rápido para decirle a Docker/K8s que el proceso está vivo.
    // No verificamos downstream (microservicios) aquí para evitar bloqueos de arranque.
    // Ruta simple para Docker y Nginx
    app.get('/health', async (request, reply) => {
        // Solo respondemos que el proceso Gateway está corriendo.
        // No verificamos downstream aquí para evitar deadlocks de arranque.
        return { 
            status: 'ok', 
			service: 'gateway',
			uptime: process.uptime(), // Útil para monitorización
            timestamp: new Date().toISOString()
        };
    });
};
