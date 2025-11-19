import { FastifyPluginAsync } from 'fastify';
import { UserSchemas } from '@transcendence/shared';
import { UserController } from '../controllers/user.controller';

export const publicRoutes: FastifyPluginAsync = async (app) => {
	
	// instancia unica de controller para todas las rutas
	const controller = new UserController();
	
	// ============================================================================
	// POST CREATE
	// ============================================================================

	/**
	* POST /users
	* Crear nuevo usuario
	* Body: { username, email, passwordHash, avatar? }
	* Response: 201 con User | 409 si duplicado
	*/
	app.post('/users', {
		schema: UserSchemas.createUserSchema,
		handler: controller.createUser.bind(controller)
	});

	// ============================================================================
	// GET CHECKS
	// ============================================================================
	
	app.get('/users/check-username/:username', {
		schema: UserSchemas.checkUsernameSchema,
		handler: controller.checkUsername.bind(controller)
	});
	
	app.get('/users/check-email/:email', {
		schema: UserSchemas.checkEmailSchema,
		handler: controller.checkEmail.bind(controller)
	});
}