import { FastifyPluginAsync } from 'fastify';
import { UserSchemas } from '@transcendence/shared';
import { UserController } from '../index.js';
import { UserAppDependencies } from '../app.js';

export const publicRoutes: FastifyPluginAsync<UserAppDependencies> = async (app, opts) => {

	// instancia unica de controller para todas las rutas
	const controller = new UserController(opts.userService);

	// ============================================================================
	// GET CHECKS
	// ============================================================================

	// Verificar disponibilidad de nombre de usuario
	app.get('/users/check-username/:username', {
		schema: UserSchemas.checkUsernameSchema,
		config: {
			rateLimit: {
				max: 10,
				timeWindow: '1 minute'
			}
		},
		handler: controller.checkUsername.bind(controller)
	});

	// Verificar disponibilidad de email
	app.get('/users/check-email/:email', {
		schema: UserSchemas.checkEmailSchema,
			config: {
			rateLimit: {
				max: 10,
				timeWindow: '1 minute'
			}
		},
		handler: controller.checkEmail.bind(controller)
	});
}