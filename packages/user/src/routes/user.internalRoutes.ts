import { FastifyPluginAsync } from 'fastify';
import { UserController, validateServiceSecret } from '../index.js';
import { AuthSchemas, UserSchemas } from '@transcendence/shared';
import { UserAppDependencies } from '../app.js';

export const internalRoutes: FastifyPluginAsync<UserAppDependencies> = async (app, opts) => {
	const controller = new UserController(opts.userService, opts.friendshipService);

	app.addHook('preHandler', validateServiceSecret);

	// ============================================================================
	// POST CREATE
	// ============================================================================

	// Create new user
	app.post('/users', {
		schema: UserSchemas.createUserSchema,
		handler: controller.createUser.bind(controller)
	});

	// ============================================================================
	// GETTERS
	// ============================================================================

	// Get user by email (internal)
	app.get('/users/by-email/:email', {
		schema: UserSchemas.getInternalUserByEmailSchema,
		handler: controller.findUserByEmailInternal.bind(controller),
	});

	// Get user by ID (internal)
	app.get('/users/by-id/:id', {
		schema: UserSchemas.getInternalUserByIdSchema,
		handler: controller.findUserByIdInternal.bind(controller)
	});

	// Obtener lista de IDs de amigos (interno)
	app.get('/users/:id/friends', {
		schema: UserSchemas.getInternalFriendsSchema,
		handler: controller.getFriendsInternal.bind(controller)
	});

	// Get user lastLogoutAt
	app.get('/users/:id/last-logout', {
		schema: UserSchemas.getLastLogoutAtSchema,
		handler: controller.getLastLogoutAt.bind(controller)
	});

	// ============================================================================
	// SETTERS
	// ============================================================================

	// Update user online status (internal)
	app.patch('/users/:id/online-status', {
		schema: UserSchemas.setOnlineStatusSchema,
		handler: controller.setOnlineStatus.bind(controller)
	});

	// ============================================================================
	// UPDATE 2FA
	// ============================================================================
	
	// Update 2FA status, totpSecret and backupCode
	app.patch('/users/:id/2fa-status', {
		schema: UserSchemas.Update2FAStatusBodySchema,
		handler: controller.update2FAStatus.bind(controller)
	});

	// ============================================================================
	// UPDATE PASSWORD
	// ============================================================================

	// Update user password (internal)
	app.put('/users/:id/password', {
		schema: UserSchemas.updatePasswordInternalSchema,
		handler: controller.updatePassword.bind(controller)
	});

	// ============================================================================
	// UPDATE LAST LOGOUT AT
	// ============================================================================

	app.put('/users/:id/logout', {
		schema: AuthSchemas.UpdateLastLogoutAtSchema,
		handler: controller.updateLastLogoutAt.bind(controller)
	});

	// ============================================================================
	// OAUTH INTERNALS
	// ============================================================================

	// Find user by OAuth provider + ID
	app.get('/users/by-oauth/:provider/:oauthId', {
		handler: controller.findByOAuth.bind(controller)
	});

	// Create OAuth user (no password)
	app.post('/users/create-oauth', {
		handler: controller.createOAuthUser.bind(controller)
	});

	// Link OAuth identity to existing user
	app.post('/users/:id/link-oauth', {
		handler: controller.linkOAuthIdentity.bind(controller)
	});

};