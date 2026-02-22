import { FastifyPluginAsync } from "fastify";
import { AuthSchemas } from "@transcendence/shared";
import { AuthController, AuthEnv, AuthMiddleware } from "../index.js";
import { AuthAppDependencies } from "../app.js";


export const authRoutes: FastifyPluginAsync<AuthAppDependencies> = async (app, opts) => {

	// instancia única de controller para todas las rutas
	const controller = new AuthController(opts.authService);

	// ============================================================================
	// PUBLIC ROUTES // LOGIN & VERIFY 2FA & VERIFY BACKUP CODE
	// ============================================================================

	/** Registrar nuevo usuario */
	app.post('/auth/register', {
		schema: AuthSchemas.RegisterBodySchema,
		config: {
			rateLimit: {
				max: AuthEnv.NODE_ENV() === 'production' ? 10 : 100,
				timeWindow: '1 hour'
			}
		},
		handler: controller.register.bind(controller)
	});

	/** Autenticar usuario y retornar tokens */
	app.post('/auth/login', {
		schema: AuthSchemas.LoginBodySchema,
		config: {
			rateLimit: {
				max: AuthEnv.NODE_ENV() === 'production' ? 20 : 100,
				timeWindow: '15 minutes'
			}
		},
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

	/** Refresca tokens de acceso y refresh */
	app.post('/auth/refresh', {
		schema: AuthSchemas.RefreshTokenBodySchema,
		config: {
			rateLimit: {
				max: 20,
				timeWindow: '1 minute'
			}
		},
		handler: controller.refreshAccessToken.bind(controller)
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
	
}