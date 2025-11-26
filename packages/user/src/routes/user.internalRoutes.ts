import { FastifyPluginAsync } from 'fastify';
import { UserController, validateServiceSecret } from '../index.js';
import { UserSchemas } from '@transcendence/shared';

export const internalRoutes: FastifyPluginAsync = async (app) => {
	const controller = new UserController();

	app.addHook('preHandler', validateServiceSecret);

	app.get('/users/by-email/:email',
		controller.getInternalUserByEmail.bind(controller)
	);

	app.get('/users/by-id/:id',
		controller.getInternalUserById.bind(controller)
	);

	app.put('/users/:id/password', {
		schema: UserSchemas.updatePasswordInternalSchema,
		handler: controller.updatePassword.bind(controller)
	});
};