import { FastifyPluginAsync } from 'fastify';
import { UserController, validateServiceSecret } from '../index.js';
import { UserSchemas } from '@transcendence/shared';

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
		schema: { tags: ['User'] },
		handler: controller.findUserByEmailInternal.bind(controller),
	});

	// Obtener usuario por ID (interno)
	app.get('/users/by-id/:id', {
		schema: { tags: ['User'] },
		handler: controller.findUserByIdInternal.bind(controller)
	});

	// ============================================================================
	// SETTERS
	// ============================================================================

	// Subir avatar del usuario
	app.post('/users/:id/uploadAvatar', {
		handler: controller.uploadAvatar.bind(controller)
	});

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
		schema: UserSchemas.Update2FAStatusBodySchema, // TODO resolver agrupacion de tags en swagger
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
};