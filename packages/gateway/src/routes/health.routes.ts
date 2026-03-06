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

// Simplified to a "Liveness Check" to allow smooth startup
import { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (app) => {
    
	// GET /health
    // Liveness Probe: Responds quickly to tell Docker/K8s that the process is alive.
    // We do not check downstream (microservices) here to avoid startup deadlocks.
    // Simple route for Docker and Nginx
    app.get('/health', async (request, reply) => {
        // Only respond that the Gateway process is running.
        // We do not check downstream here to avoid startup deadlocks.
        return {
            status: 'ok',
			service: 'gateway',
			uptime: process.uptime(), // Useful for monitoring
            timestamp: new Date().toISOString()
        };
    });
};
