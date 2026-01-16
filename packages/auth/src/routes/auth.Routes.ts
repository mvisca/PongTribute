import { FastifyPluginAsync } from "fastify";
import { AuthSchemas } from "@transcendence/shared";
import { AuthController, AuthMiddleware, AuthService } from "../index.js";


export const authRoutes: FastifyPluginAsync = async (app) => {

	// instancia única de controller para todas las rutas
	const controller = new AuthController();

	// ============================================================================
	// PUBLIC ROUTES // LOGIN & VERIFY 2FA & VERIFY BACKUP CODE
	// ============================================================================

	/** Registrar nuevo usuario */
	app.post('/auth/register', {
		schema: AuthSchemas.RegisterBodySchema,
		handler: controller.register.bind(controller)
	});

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
	app.post('/auth/verify-backup-code', {
		schema: AuthSchemas.VerifyBackupCodeBodySchema,
		handler: controller.verifyBackupCode.bind(controller)
	});

	// ============================================================================
	// PROTECTED ROUTES // CON JWT
	// ============================================================================

	/** Desautenticar usuario y borrar tokens */
	app.post('/auth/logout', {
		schema: AuthSchemas.LogoutBodySchema,
		preHandler: [AuthMiddleware.validateJWT],
		handler: controller.logout.bind(controller)
	});

	/** Regeneración de access token con refresh token */
	app.post('/auth/refresh', {
		schema: AuthSchemas.RefreshTokenBodySchema,
		handler: controller.refreshAccessToken.bind(controller)
	});
	// ============================================================================
	// PROTECTED ROUTES // CON JWT + OWNERSHIP
	// ============================================================================

	/** Activar 2FA */
	app.post('/auth/:id/enable-2fa', {
		preHandler: [AuthMiddleware.validateJWT, AuthMiddleware.verifyOwnership],
		schema: AuthSchemas.Enable2FABodySchema,
		handler: controller.enable2FA.bind(controller)
	});

	/** Completar configuración de 2FA */
	app.post('/auth/:id/verify-2fa-setup', {
		preHandler: [AuthMiddleware.validateJWT, AuthMiddleware.verifyOwnership],
		schema: AuthSchemas.Verify2FASetupBodySchema,
		handler: controller.verify2FASetup.bind(controller)
	});

	/** Desactivar 2FA */
	app.post('/auth/:id/disable-2fa', {
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

} // DUDA separar rutas publicas y privadas en ficheros