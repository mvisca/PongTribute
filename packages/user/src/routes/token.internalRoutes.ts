import { FastifyPluginAsync } from 'fastify';
import { TokenController, validateServiceSecret } from '../index.js';
import { AuthSchemas } from '@transcendence/shared';

export const internalTokenRoutes: FastifyPluginAsync = async (app) => {
	const controller = new TokenController();

	app.addHook('preHandler', validateServiceSecret);

	app.post('/internal/tokens/verify', {
		schema: AuthSchemas.VerifyRefreshTokenSchema,
		handler: controller.verifyToken.bind(controller)
	});

	app.post('/internal/tokens', {
		schema: AuthSchemas.RefreshTokenDataSchema,
		handler: controller.createToken.bind(controller)
	});
	
	app.delete('/internal/tokens/user/:id', {
		schema: AuthSchemas.DeleteRefreshTokenByUserSchema,
		handler: controller.deleteByUserId.bind(controller)
	}
	);
	
	app.delete('/internal/tokens/expired', {
		schema: AuthSchemas.DeleteExpiredTokensSchema,
		handler: controller.cleanExpired.bind(controller)
	});
}
