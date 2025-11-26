import { FastifyPluginAsync } from 'fastify';
import { UserSchemas } from '@transcendence/shared';
import { UserController, AuthMiddleware } from '../index.js';

export const protectedRoutes: FastifyPluginAsync = async (app) => {
	const controller = new UserController();

	app.addHook('preHandler', AuthMiddleware.validateJWT);

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
	// PUT UPDATE
	// ============================================================================

	app.put('/users/:id/anonymize', {
		preHandler: AuthMiddleware.verifyOwnership,
		schema: UserSchemas.anonymizeUserSchema,
		handler: controller.anonymizeUser.bind(controller)
	});

/*	app.put('/users/:id/password', {
		preHandler: [AuthMiddleware.verifyOwnership],
		schema: UserSchemas.updatePasswordInternalSchema,
		handler: controller.updatePassword.bind(controller)
	}); */ // Redundante

	app.put('/users/:id', {
		preHandler: [AuthMiddleware.verifyOwnership],
		schema: UserSchemas.UpdateUserSchema,
		handler: controller.updateUser.bind(controller)
	});

	// ============================================================================
	// DELETE
	// ============================================================================

	app.delete('/users/:id', {
		preHandler: [AuthMiddleware.verifyOwnership],
		schema: UserSchemas.deleteUserSchema,
		handler: controller.deleteUser.bind(controller)
	});
}