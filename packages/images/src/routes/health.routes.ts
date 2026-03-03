import { FastifyPluginAsync } from 'fastify';
import { HealthController } from '../controllers/HealthController.js';
import { ImagesAppDependencies } from '../types.js';

export const healthRoutes: FastifyPluginAsync<ImagesAppDependencies> = async (app, opts) => {
	const controller = new HealthController(opts.cloudinaryService);

	app.get('/health', async (request, reply) => {
		return controller.handleHealthCheck(request, reply);
	});
};
