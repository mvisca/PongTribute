import { FastifyPluginAsync } from 'fastify';
import { UserController } from '../controllers/user.controller';
import { validateServiceSecret } from '../middleware/validateServiceSecret';

export const internalRoutes: FastifyPluginAsync = async (app) => {
	const controller = new UserController();

	app.addHook('preHandler', validateServiceSecret),

	app.get('/users/by-email/:email',
		controller.getInternalUserByEmail.bind(controller)
	);
};