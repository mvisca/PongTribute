import { FastifyRequest, FastifyReply } from "fastify";
import { AuthTypes, SharedErrors } from "@transcendence/shared";
import type { TokenPair } from "../types.js";
import { AuthService, AuthEnv } from "../index.js";

export class AuthController {

	private authService: AuthService;

	constructor(authService: AuthService) {
		this.authService = authService;
	}


	// ============================================================================
	// HELPER DE SETEO DE COOKIE
	// ============================================================================
	private setTokenCookie(reply: FastifyReply, refreshToken: string): void {
		reply.setCookie('refreshToken', refreshToken, {
			httpOnly: true,
			secure: AuthEnv.NODE_ENV() === 'production',
			sameSite: 'strict',
			path: '/',
			maxAge: AuthEnv.REFRESH_TOKEN_EXPIRY()
		});
	}

	// ============================================================================
	// LOGIN PROCESS W/2FA & LOGOUT
	// ============================================================================

	/** Login con email y password */
	async login(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> {
		try {
			const { email, password } = request.body as AuthTypes.LoginBody;
			const result = await this.authService.login(email, password);

			// Login pide 2FA totpCode
			if ('twoFactorRequired' in result)
				// 202 ACCEPTED => autenticación parcial, requiere paso adicional 
				return reply.code(202).send(result);

			// Token Pair
			const { accessToken, refreshToken, userPayload } = result as TokenPair;
			this.setTokenCookie(reply, refreshToken);

			// 200 OK = Login exitoso sin 2FA
			return reply.code(200).send({ token: accessToken, user: userPayload });

		} catch (err) {
			SharedErrors.handleError(err, reply);
		}
	}

	/** Refresh access token */
	async refreshAccessToken(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> {
		try {
			const refreshToken = request.cookies?.refreshToken;

			if (!refreshToken) {
				throw new SharedErrors.UnauthorizedError('Refresh token missing', {
					operation: 'refreshAccessToken'
				});
			}

			// Genera nuevo token pair con el refresh token válido
			const result = await this.authService.refreshAccessToken(refreshToken);

			// Desestructura los tokens y payload para tratarlos por seprado
			const { accessToken, refreshToken: newRefreshToken, userPayload } = result as TokenPair;

			// Establece el nuevo refresh token como cookie
			this.setTokenCookie(reply, newRefreshToken);

			// Envía en la response el access token y el payload
			return reply.code(200).send({ token: accessToken, user: userPayload });
		} catch (err) {
			SharedErrors.handleError(err, reply);
		}
	}

	/** Logout con JWT y ownership */
	async logout(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> {
		try {
			const { id } = request.user!;
			await this.authService.logout(id);

			reply.clearCookie('refreshToken', { path: '/' });

			return reply.code(204).send();
		} catch (err) {
			SharedErrors.handleError(err, reply);
		}
	}

	// ============================================================================
	// 2FA VERIFICATION IN LOGIN
	// ============================================================================

	/** Completar login con totpCode */
	async verify2FAWithToken(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> {
		try {
			const { provisionalToken, totpCode } = request.body as AuthTypes.LoginVerify2FABody;
			const result = await this.authService.verify2FAWithToken(provisionalToken, totpCode);

			const { accessToken, refreshToken: newRefreshToken, userPayload } = result as TokenPair;
			this.setTokenCookie(reply, newRefreshToken);
			return reply.code(200).send({ token: accessToken, user: userPayload });
		} catch (err) {
			SharedErrors.handleError(err, reply);
		}
	}

	/** Login con backupCode (desactiva 2FA) */
	async verifyBackupCode(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> {
		try {

			const { provisionalToken, backupCode } = request.body as AuthTypes.VerifyBackupCodeBody;
			const result = await this.authService.verifyBackupCode(provisionalToken, backupCode);

			const { accessToken, refreshToken: newRefreshToken, userPayload } = result as TokenPair;
			this.setTokenCookie(reply, newRefreshToken);
			return reply.code(200).send({ token: accessToken, user: userPayload });

		} catch (err) {
			SharedErrors.handleError(err, reply);
		}
	}

	// ============================================================================
	// 2FA MANAGEMENT
	// ============================================================================

	/** Iniciar setup de 2FA */
	async enable2FA(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> {
		try {

			const { id } = request.params as AuthTypes.UserIdParams;
			const result = await this.authService.enable2FA(id);

			return reply.code(200).send(result);
		} catch (err) {
			SharedErrors.handleError(err, reply);
		}
	}

	/** Completar setup de 2FA (require JWT + ownership) */
	async verify2FASetup(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> {
		try {
			const { setupToken, totpCode } = request.body as AuthTypes.Verify2FASetupBody;
			const result = await this.authService.verify2FASetup(setupToken, totpCode);

			const { accessToken, refreshToken: newRefreshToken, userPayload } = result as TokenPair;
			this.setTokenCookie(reply, newRefreshToken);
			return reply.code(200).send({ token: accessToken, user: userPayload });

		} catch (err) {
			SharedErrors.handleError(err, reply);
		}
	}

	/** Desactivar 2FA (requeire JWT + ownership) */
	async disable2FA(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> {
		try {
			const { id } = request.params as AuthTypes.UserIdParams;
			const { password } = request.body as AuthTypes.Disable2FABody;

			const result = await this.authService.disable2FA(id, password);

			const { accessToken, refreshToken: newRefreshToken, userPayload } = result as TokenPair;
			this.setTokenCookie(reply, newRefreshToken);
			return reply.code(200).send({ token: accessToken, user: userPayload });

		} catch (err) {
			SharedErrors.handleError(err, reply);
		}
	}

	// ============================================================================
	// CREATE USER
	// ============================================================================

	/** Crea usuario y hace login */
	async register(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> {
		try {

			const {
				username,
				email,
				avatar,
				password } = request.body as AuthTypes.RegisterBody;

			const result = await this.authService.register(username, email, password, avatar);

			const { accessToken, refreshToken: newRefreshToken, userPayload } = result as TokenPair;
			this.setTokenCookie(reply, newRefreshToken);
			return reply.code(200).send({ token: accessToken, user: userPayload });
		} catch (err) {
			SharedErrors.handleError(err, reply);
		}
	}

	// ============================================================================
	// PASSWORD MANAGEMENT
	// ============================================================================

	/** Actualizapassword con old y new password */
	async updatePassword(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> {
		try {
			const { id } = request.params as AuthTypes.UserIdParams;
			const { oldPassword, newPassword } = request.body as AuthTypes.UpdatePasswordBody;

			const result = await this.authService.changePassword(id, oldPassword, newPassword);

			const { accessToken, refreshToken: newRefreshToken, userPayload } = result as TokenPair;
			this.setTokenCookie(reply, newRefreshToken);
			return reply.code(200).send({ token: accessToken, user: userPayload });
		} catch (err) {
			SharedErrors.handleError(err, reply);
		}
	}

	/** Solicitar email de reset de password (siempre 204, no filtra existencia) */
	async passwordResetRequest(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> {
		try {
			const { email } = request.body as AuthTypes.PasswordResetRequestBody;
			await this.authService.requestPasswordReset(email);
		} catch (err) {
			// Importante: no filtrar por errores (ni existencia de usuario)
			request.log.error({ err }, 'Password reset request failed');
		}
		return reply.code(204).send();
	}

	/** Confirmar reset de password con token + nueva contraseña */
	async passwordResetConfirm(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> {
		try {
			const { token, newPassword } = request.body as AuthTypes.PasswordResetConfirmBody;
			await this.authService.confirmPasswordReset(token, newPassword);
			return reply.code(204).send();
		} catch (err) {
			SharedErrors.handleError(err, reply);
		}
	}

}