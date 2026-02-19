import { FastifyPluginAsync } from 'fastify';
import { TokenController, validateServiceSecret } from '../index.js';
import { UserSchemas } from '@transcendence/shared';
import { UserAppDependencies } from '../app.js';

export const internalTokenRoutes: FastifyPluginAsync<UserAppDependencies> = async (app) => {
	const controller = new TokenController();

	app.addHook('preHandler', validateServiceSecret);

	// Verificar validez de un refresh token
	app.post('/tokens/verify', {
		schema: UserSchemas.VerifyRefreshTokenSchema,
		handler: controller.verifyToken.bind(controller)
	});

	// Crear nuevo refresh token
	app.post('/tokens', {
		schema: UserSchemas.RefreshTokenDataSchema,
		handler: controller.createToken.bind(controller)
	});

	// Eliminar todos los tokens de un usuario
	app.delete('/tokens/user/:id', {
		schema: UserSchemas.DeleteRefreshTokenByUserSchema,
		handler: controller.deleteByUserId.bind(controller)
	}
	);

	// Limpiar tokens expirados
	app.delete('/tokens/expired', {
		schema: UserSchemas.DeleteExpiredTokensSchema,
		handler: controller.cleanExpired.bind(controller)
	});
}