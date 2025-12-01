import { FastifyPluginAsync } from 'fastify';
import { UserSchemas } from '@transcendence/shared';
import { UserController } from '../index.js';

export const publicRoutes: FastifyPluginAsync = async (app) => {
	
	// instancia unica de controller para todas las rutas
	const controller = new UserController();
	
	// ============================================================================
	// POST CREATE
	// ============================================================================

	// Crear nuevo usuario
	app.post('/users', {
		schema: UserSchemas.createUserSchema,
		handler: controller.createUser.bind(controller)
	});

	// ============================================================================
	// GET CHECKS
	// ============================================================================

	// Verificar disponibilidad de nombre de usuario
	app.get('/users/check-username/:username', {
		schema: UserSchemas.checkUsernameSchema,
		handler: controller.checkUsername.bind(controller)
	});

	// Verificar disponibilidad de email
	app.get('/users/check-email/:email', {
		schema: UserSchemas.checkEmailSchema,
		handler: controller.checkEmail.bind(controller)
	});
}