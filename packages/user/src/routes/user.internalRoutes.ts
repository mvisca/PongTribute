import { FastifyPluginAsync } from 'fastify';
import { UserController, validateServiceSecret } from '../index.js';
import { UserSchemas } from '@transcendence/shared';

export const internalRoutes: FastifyPluginAsync = async (app) => {
	const controller = new UserController();

	app.addHook('preHandler', validateServiceSecret);

	// ============================================================================
	// GETTERS
	// ============================================================================

	// Obtener usuario por email (interno)
	app.get('/users/by-email/:email',
		controller.findUserByEmailInternal.bind(controller)
	);

	// Obtener usuario por ID (interno)
	app.get('/users/by-id/:id',
		controller.findUserByIdInternal.bind(controller)
	);

	// ============================================================================
	// SETTERS
	// ============================================================================

	// Actualizar el estado online del usuario (interno)
	app.patch('/users/:id/online-status', {
		schema: UserSchemas.setOnlineStatusSchema,
		handler: controller.setOnlineStatus.bind(controller)
	})

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
};