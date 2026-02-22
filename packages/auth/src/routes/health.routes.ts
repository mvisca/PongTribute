import { FastifyPluginAsync } from "fastify";
import { HealthController } from "../controllers/health.controller.js";
import { AuthAppDependencies } from "../app.js";

export const healthRoutes: FastifyPluginAsync<AuthAppDependencies> = async (app, opts) => {
	const controller = new HealthController(opts.redisClient);

	app.get('/health', async (request, reply) => {
		return controller.handleHealthCheck(request, reply);
	});
};
