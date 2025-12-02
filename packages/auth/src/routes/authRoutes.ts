import { FastifyPluginAsync } from "fastify";
import { AuthSchemas } from "@transcendence/shared";
import { AuthController, AuthMiddleware } from "../index.js";


export const authRoutes: FastifyPluginAsync = async (app) => {
	const controller = new AuthController();

	// ============================================================================
	// LOGIN / LOGOUT
	// ============================================================================

	// Autenticar usuario y retornar tokens
	app.post('/auth/login', {
		schema: AuthSchemas.LoginBodySchema,
		handler: controller.login.bind(controller)
	});
	// TODO agregar schemas para validacion

	// Verifica tokens de 2FA
	app.post('/auth/verify-2fa', {
		schema: AuthSchemas.Verify2FABodySchema,
		handler: controller.verify2FAWithToken.bind(controller)
	});

	// Desautenticar usuario y borrar tokens
	app.post('/auth/logout', {
		preHandler: [AuthMiddleware.validateJWT],
		handler: controller.logout.bind(controller)
	});

	// ============================================================================
	// UPDATE PASSWORD
	// ============================================================================

	// Actualizar contraseña (requiere verificación de propiedad)
	app.put('/auth/:id/password', {
		preHandler: [AuthMiddleware.validateJWT, AuthMiddleware.verifyOwnership],
		schema: AuthSchemas.UpdatePasswordBodySchema,
		handler: controller.updatePassword.bind(controller)
	}); // TODO agregar schemas para validacion de inputs

}