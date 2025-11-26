import { FastifyPluginAsync } from "fastify";
import { AuthSchemas } from "@transcendence/shared";
import { AuthController, AuthMiddleware } from "../index.js";


export const authRoutes: FastifyPluginAsync = async (app) => {
	const controller = new AuthController();

	// ============================================================================
	// GET READ / CHECKS & GETS
	// ============================================================================

	app.post('/auth/login', {
		schema: AuthSchemas.LoginBodySchema,
		handler: controller.login.bind(controller)
	});
	// TODO agregar schemas para validacion

	app.put('/auth/:id/password', {
		preHandler: [AuthMiddleware.validateJWT, AuthMiddleware.verifyOwnership],
		schema: AuthSchemas.UpdatePasswordBodySchema,
		handler: controller.updatePassword.bind(controller)
	}); // TODO agregar schemas para validacion de inputs
}