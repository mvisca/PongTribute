import { FastifyPluginAsync } from 'fastify';
import { TokenController, validateServiceSecret } from '../index.js';
import { AuthSchemas } from '@transcendence/shared';

export const internalTokenRoutes: FastifyPluginAsync = async (app) => {
	const controller = new TokenController();

	app.addHook('preHandler', validateServiceSecret);

	// Verificar validez de un refresh token
	app.post('/internal/tokens/verify', {
		schema: AuthSchemas.VerifyRefreshTokenSchema,
		handler: controller.verifyToken.bind(controller)
	});

	// Crear nuevo refresh token
	app.post('/internal/tokens', {
		schema: AuthSchemas.RefreshTokenDataSchema,
		handler: controller.createToken.bind(controller)
	});

	// Eliminar todos los tokens de un usuario
	app.delete('/internal/tokens/user/:id', {
		schema: AuthSchemas.DeleteRefreshTokenByUserSchema,
		handler: controller.deleteByUserId.bind(controller)
	}
	);

	// Limpiar tokens expirados
	app.delete('/internal/tokens/expired', {
		schema: AuthSchemas.DeleteExpiredTokensSchema,
		handler: controller.cleanExpired.bind(controller)
	});
}
