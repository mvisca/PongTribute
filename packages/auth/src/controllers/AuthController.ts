import { FastifyRequest, FastifyReply } from "fastify";
import { AuthTypes, UserTypes } from "@transcendence/shared";
import { AuthService } from "../index.js";

export class AuthController {
	private authService: AuthService;

	constructor() {
		this.authService = new AuthService();
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
			console.log('error handler here');
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