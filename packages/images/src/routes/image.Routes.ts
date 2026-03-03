import { FastifyPluginAsync } from 'fastify';
import { ImagesController } from '../controllers/ImagesController.js';
import { validateServiceSecret } from '../middleware/validateServiceSecret.js';
import { ImagesAppDependencies } from '../types.js';

export const imageRoutes: FastifyPluginAsync<ImagesAppDependencies> = async (app, opts) => {
	const controller = new ImagesController(opts.cloudinaryService);

	app.post('/upload', {
		preHandler: [validateServiceSecret],
		handler: controller.upload.bind(controller)
	});

	app.delete('/delete', {
		preHandler: [validateServiceSecret],
		handler: controller.delete.bind(controller)
	});
};
