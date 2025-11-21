import { FastifyPluginAsync } from "fastify";
import { AuthController } from "../controllers/AuthController";
import { validateJWT } from "src/middleware/validateJWT";

export const authRoutes: FastifyPluginAsync = async (app) => {
	const controller = new AuthController();

	// ============================================================================
	// GET READ / CHECKS & GETS
	// ============================================================================

	app.post('/auth/login', {
		handler: controller.login.bind(controller)
	});

	app.put('/auth/:id/password', {
		preHandler: validateJWT,
		handler: controller.updatePassword.bind(controller)
	});
}