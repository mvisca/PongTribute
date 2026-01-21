import { FastifyPluginAsync } from 'fastify';
import { UserSchemas, FriendshipSchemas } from '@transcendence/shared';
import { UserController, FriendshipController, AuthMiddleware } from '../index.js';

export const protectedRoutes: FastifyPluginAsync = async (app) => {
	const controller = new UserController();
	const friendshipController = new FriendshipController();

	app.addHook('preHandler', AuthMiddleware.validateJWT);

	// ============================================================================
	// GET READ / CHECKS & GETS
	// ============================================================================

	// Obtener usuario por nombre de usuario
	app.get('/users/username/:username', {
		schema: UserSchemas.getUserByUsernameSchema,
		handler: controller.findUserByUsername.bind(controller)
	});

	// Obtener usuario por email
	app.get('/users/email/:email', {
		schema: UserSchemas.getUserByEmailSchema,
		handler: controller.findUserByEmail.bind(controller)
	});

	// Obtener usuario por ID
	app.get('/users/:id', {
			schema: UserSchemas.getUserByIdSchema,
			handler: controller.findUserById.bind(controller)
		}
	);

	// ============================================================================
	// PUT UPDATE
	// ============================================================================

	// Anonimizar datos de usuario (requiere verificación de ownership)
	app.put('/users/:id/anonymize', {
		preHandler: [AuthMiddleware.verifyOwnership],
		schema: UserSchemas.anonymizeUserSchema,
		handler: controller.anonymizeUser.bind(controller)
	});

	// Actualizar usuario (requiere verificación de ownership)
	app.put('/users/:id', {
		preHandler: [AuthMiddleware.verifyOwnership],
		schema: UserSchemas.UpdateUserSchema,
		handler: controller.updateUser.bind(controller)
	});

	// ============================================================================
	// DELETE
	// ============================================================================

	// Eliminar usuario (requiere verificación de ownership)
	app.delete('/users/:id', {
		preHandler: [AuthMiddleware.verifyOwnership],
		schema: UserSchemas.deleteUserSchema,
		handler: controller.deleteUser.bind(controller)
	});

	// ============================================================================
	// FRIENDSHIPS
	// ============================================================================

	app.get('/friendships', {
		schema: FriendshipSchemas.ListFriendshipsSchema,
		handler: friendshipController.listFriendships.bind(friendshipController)
	});

	app.post('/friendships', {
		schema: FriendshipSchemas.CreateFriendshipSchema,
		handler: friendshipController.createFriendship.bind(friendshipController)
	});

	app.patch('/friendships/:friendId', {
		schema: FriendshipSchemas.UpdateFriendshipSchema,
		handler: friendshipController.updateFriendship.bind(friendshipController)
	});
}