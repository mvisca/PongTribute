import { FastifyRequest, FastifyReply } from "fastify";
import { AuthTypes, SharedErrors } from "@transcendence/shared";
import { AuthService } from "../index.js";

export class AuthController {

	private authService: AuthService;

	constructor() {
		this.authService = new AuthService();
	}

		private errorHandler(err: unknown, request: FastifyRequest, reply: FastifyReply): void {
		if (err instanceof SharedErrors.NotFoundError) {
			reply.code(404).send({error: 'Not Found', message: err.message, resource:err.resource});
			return;
		}
		
		if (err instanceof SharedErrors.ConflictError) {
			reply.code(409).send({error: 'Conflict', message: err.message, field: err.field});
			return;
		}
		
		if (err instanceof SharedErrors.ValidationError) {
			reply.code(403).send({error: 'Forbidden', message: err.message, field: err.field});
			return;
		}
		
		request.log.error(err);
		const message = err instanceof Error ? err.message : 'Unknown Error';
		reply.code(500).send({error: 'Internal Server Error', message});
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
				return reply.code(200).send(result);
			
			// Login exitoso sin  2FA
			return reply.code(200).send(result); // TODO tiene sentido el if si la respuesta es igual?

		} catch(err) {
			this.errorHandler(err, request, reply);
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

			return reply.code(204).send();
			
		} catch(err) {
			this.errorHandler(err, request, reply);
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

			return reply.code(200).send(result);

		} catch(err) {
			this.errorHandler(err, request, reply);
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
			
			return reply.code(200).send(result);

		} catch(err) {
			this.errorHandler(err, request, reply);
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

			const { id }= request.params as AuthTypes.UserIdParams;
			const result = await this.authService.enable2FA(id);
			
			return reply.code(200).send(result);

		} catch(err) {
			this.errorHandler(err, request, reply);
		}
	}

	/** Completar setup de 2FA (require JWT + ownership) */
	async verify2FASetup(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> {
		try {
			const { setupToken, totpCode } = request.body as AuthTypes.Verify2FASetupBody;
			await this.authService.verify2FASetup(setupToken, totpCode);

			return reply.code(204).send();

		} catch(err) {
			this.errorHandler(err, request, reply);
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
			
			await this.authService.disable2FA(id, password);

			return reply.code(204).send();

		} catch(err) {
			this.errorHandler(err, request, reply);
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

			await this.authService.changePassword(id, oldPassword, newPassword);

			return reply.code(204).send();

		} catch(err) {
			this.errorHandler(err, request, reply);
		}
	}
}