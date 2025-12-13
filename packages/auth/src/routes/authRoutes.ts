import { FastifyPluginAsync } from "fastify";
import { AuthSchemas } from "@transcendence/shared";
import { AuthController, AuthMiddleware, AuthService } from "../index.js";


export const authRoutes: FastifyPluginAsync = async (app) => {

	// instancia única de controller para todas las rutas
	const controller = new AuthController();

	// ============================================================================
	// PUBLIC ROUTES // LOGIN & VERIFY 2FA & VERIFY BACKUP CODE
	// ============================================================================

	/** Autenticar usuario y retornar tokens */
	app.post('/auth/login', {
		schema: AuthSchemas.LoginBodySchema,
		handler: controller.login.bind(controller)
	});

	/** Verifica tokens de 2FA para login */
	app.post('/auth/verify-2fa', {
		schema: AuthSchemas.LoginVerify2FABodySchema,
		handler: controller.verify2FAWithToken.bind(controller)
	});

	/** Login con backupCode */
	app.post('/auth/verify--------backup-code', {
		schema: AuthSchemas.VerifyBackupCodeBodySchema,
		handler: controller.verifyBackupCode.bind(controller)
	});

	// ============================================================================
	// PROTECTED ROUTES // CON JWT
	// ============================================================================

	/** Desautenticar usuario y borrar tokens */
	app.post('/auth/logout', {
		preHandler: [AuthMiddleware.validateJWT],
		handler: controller.logout.bind(controller)
	});

	// ============================================================================
	// PROTECTED ROUTES // CON JWT + OWNERSHIP
	// ============================================================================

	/** Activar 2FA */
	app.post('/auth/enable-2fa', {
		preHandler: [AuthMiddleware.validateJWT, AuthMiddleware.verifyOwnership],
		schema: AuthSchemas.Enable2FABodySchema,
		handler: controller.enable2FA.bind(controller)
	});

	/** Completar configuración de 2FA */
	app.post('/auth/verify-2fa-setup', {
		preHandler: [AuthMiddleware.validateJWT, AuthMiddleware.verifyOwnership],
		schema: AuthSchemas.Verify2FASetupBodySchema,
		handler: controller.verify2FASetup.bind(controller)
	});

	/** Desactivar 2FA */
	app.post('/auth/diable-2fa', {
		preHandler: [AuthMiddleware.validateJWT, AuthMiddleware.verifyOwnership],
		schema: AuthSchemas.Disable2FABodySchema,
		handler: controller.disable2FA.bind(controller)
	});

	/** Actualizar contraseña (requiere verificación de propiedad) */
	app.put('/auth/:id/password', {
		preHandler: [AuthMiddleware.validateJWT, AuthMiddleware.verifyOwnership],
		schema: AuthSchemas.UpdatePasswordBodySchema,
		handler: controller.updatePassword.bind(controller)
	});
} // TODO separar rutas publicas y privadas en ficheros