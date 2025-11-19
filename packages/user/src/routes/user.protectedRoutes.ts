import { FastifyPluginAsync } from 'fastify';
import { UserSchemas } from '@transcendence/shared';
import { UserController } from '../controllers/user.controller';
import { validateJWT } from '../middleware/validateJWT';

export const protectedRoutes: FastifyPluginAsync = async (app) => {
	const controller = new UserController();

	app.addHook('preHandler', validateJWT);

	// ============================================================================
	// GET READ / CHECKS & GETS
	// ============================================================================

	app.get('/users/username/:username', {
		schema: UserSchemas.getUserByUsernameSchema,
		handler: controller.getUserByUsername.bind(controller)
	});
	
	app.get('/users/email/:email', {
		schema: UserSchemas.getUserByEmailSchema,
		handler: controller.getUserByEmail.bind(controller)
	});

	app.get('/users/:id', {
			schema: UserSchemas.getUserByIdSchema,
			handler: controller.getUserById.bind(controller)
		}
	);

	// ============================================================================
	// GET READ / CHECKS & GETS
	// ============================================================================

	app.put('/users/:id/password', {
		schema: UserSchemas.updatePasswordSchema,
		handler: controller.updatePassword.bind(controller)
	});
 
	app.put('/users/:id/anonymize', {
		schema: UserSchemas.anonymizeUserSchema,
		handler: controller.anonymizeUser.bind(controller)
	});

	app.put('/users/:id', {
		schema: UserSchemas.updateUserSchema,
		handler: controller.updateUser.bind(controller)
	});

	// ============================================================================
	// DELETE
	// ============================================================================

	app.delete('/users/:id', {
		schema: UserSchemas.deleteUserSchema,
		handler: controller.deleteUser.bind(controller)
	});
}