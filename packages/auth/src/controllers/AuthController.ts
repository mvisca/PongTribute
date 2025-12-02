import { FastifyRequest, FastifyReply } from "fastify";
import { AuthTypes, SharedErrors, UserTypes } from "@transcendence/shared";
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
	// LOGIN PROCESS W/2FA
	// ============================================================================

	async login(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		const { email, password } = request.body as AuthTypes.LoginBody;

		const result = await this.authService.login(email, password);

		if (!result) {
			return reply.code(401).send({
				error: 'Unauthorized',
				message: 'Credenciales inválidas'
			});
		}

		return reply.code(200).send(result);
	}

	async logout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const { id } = request.params as { id: string };
			await this.authService.logout(id);
			return reply.code(204).send();
		} catch(err) {
			// TODO implementar handle error con los errot classes centralizados
		}
	}

	// ============================================================================
	// LOGIN PROCESS W/2FA
	// ============================================================================

	async verify2FAWithToken(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const { provisionalToken, totpCode } = request.body as AuthTypes.Verify2FABody;
			const result = await this.authService.verify2FAWithToken(provisionalToken, totpCode);
			return reply.code(200).send(result);
		} catch(err) {
			if (err instanceof SharedErrors.UnauthorizedError) {
				return reply.code(401).send({
					error: 'Unauthorized'
				});
			}
		}
	}

	// ============================================================================
	// UPDATE PASSWORD
	// ============================================================================

	async updatePassword(request: FastifyRequest, reply: FastifyReply): Promise<void> {

		try {
			const userId = request.user!.id;
			const id = request.params as { id: string };
			const { oldPassword, newPassword } = request.body as AuthTypes.UpdatePasswordBody;

			if (!userId) {
				return reply.code(401).send({
					error: 'Unauthorized',
					message: 'Usuario no autenticado'
				});
			} // TODO removerlo si es posible pero userId se necesita  para changePassword

			await this.authService.changePassword(userId, oldPassword, newPassword);
			
			return reply.code(204).send();

		} catch(err: any) {
			if (err.message === 'Usuario no encontrado') {
				return reply.code(404).send({
					error: 'Not found',
					message: err.message
				});
			}

			if (err.message === 'Password actual incorrecta') {
				return reply.code(401).send({
					error: 'Unauthorized',
					message: err.message
				});
			}

			request.log.error(err);
			throw (err);
		}
	}
}