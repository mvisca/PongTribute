import { FastifyPluginAsync } from 'fastify';
import { UserController, validateServiceSecret } from '../index.js';
import { AuthSchemas, UserSchemas } from '@transcendence/shared';

export const internalRoutes: FastifyPluginAsync = async (app) => {
	const controller = new UserController();

	app.addHook('preHandler', validateServiceSecret);

	// ============================================================================
	// POST CREATE
	// ============================================================================

	// Crear nuevo usuario
	app.post('/users', {
		schema: UserSchemas.createUserSchema,
		handler: controller.createUser.bind(controller)
	});

	// ============================================================================
	// GETTERS
	// ============================================================================

	// Obtener usuario por email (interno)
	app.get('/users/by-email/:email', {
		schema: UserSchemas.getInternalUserByEmailSchema,
		handler: controller.findUserByEmailInternal.bind(controller),
	});

	// Obtener usuario por ID (interno)
	app.get('/users/by-id/:id', {
		schema: UserSchemas.getInternalUserByIdSchema,
		handler: controller.findUserByIdInternal.bind(controller)
	});

	// Obtener lista de IDs de amigos (interno)
	app.get('/users/:id/friends', {
		schema: UserSchemas.getInternalFriendsSchema,
		handler: controller.getFriendsInternal.bind(controller)
	});

	// Obtener lastLogoutAt de usuario
	app.get('/users/:id/last-logout', {
		schema: UserSchemas.getLastLogoutAtSchema,
		handler: controller.getLastLogoutAt.bind(controller)
	});

	// ============================================================================
	// SETTERS
	// ============================================================================

	// Actualizar el estado online del usuario (interno)
	app.patch('/users/:id/online-status', {
		schema: UserSchemas.setOnlineStatusSchema,
		handler: controller.setOnlineStatus.bind(controller)
	});

	// ============================================================================
	// UPDATE 2FA
	// ============================================================================
	
	// Actualizar status del 2FA, totpSecret y backupCode
	app.patch('/users/:id/2fa-status', {
		schema: UserSchemas.Update2FAStatusBodySchema,
		handler: controller.update2FAStatus.bind(controller)
	});

	// ============================================================================
	// UPDATE PASSWORD
	// ============================================================================

	// Actualizar contraseña de usuario (interno)
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

};