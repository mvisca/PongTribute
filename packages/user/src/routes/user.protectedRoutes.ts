import { FastifyPluginAsync } from 'fastify';
import { UserSchemas, FriendshipSchemas } from '@transcendence/shared';
import { UserController, FriendshipController, AuthMiddleware } from '../index.js';
import { UserAppDependencies } from '../app.js';

export const protectedRoutes: FastifyPluginAsync<UserAppDependencies> = async (app, opts) => {
	const controller = new UserController(opts.userService, opts.friendshipService);
	const friendshipController = new FriendshipController(opts.friendshipService);

	const validateJWT = AuthMiddleware.createValidateJWT(opts.userService);
	app.addHook('preHandler', validateJWT);

	// ============================================================================
	// GET READ / CHECKS & GETS
	// ============================================================================

	// Get user by username
	app.get('/users/username/:username', {
		schema: UserSchemas.getUserByUsernameSchema,
		handler: controller.findUserByUsername.bind(controller)
	});

	// Get user by email
	app.get('/users/email/:email', {
		schema: UserSchemas.getUserByEmailSchema,
		handler: controller.findUserByEmail.bind(controller)
	});

	// Get user by ID
	app.get('/users/:id', {
			schema: UserSchemas.getUserByIdSchema,
			handler: controller.findUserById.bind(controller)
		}
	);

	// ============================================================================
	// PUT UPDATE
	// ============================================================================

	// Anonymize user data (requires ownership verification)
	app.put('/users/:id/anonymize', {
		preHandler: [AuthMiddleware.verifyOwnership],
		schema: UserSchemas.anonymizeUserSchema,
		handler: controller.anonymizeUser.bind(controller)
	});

	// Update user (requires ownership verification)
	app.put('/users/:id', {
		preHandler: [AuthMiddleware.verifyOwnership],
		schema: UserSchemas.UpdateUserSchema,
		handler: controller.updateUser.bind(controller)
	});

	// ============================================================================
	// DELETE
	// ============================================================================

	// Delete user (requires ownership verification)
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

	app.delete('/friendships/:friendId', {
		schema: FriendshipSchemas.DeleteFriendshipSchema,
		handler: friendshipController.deleteFriendship.bind(friendshipController)
	});
}