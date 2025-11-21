import { FastifyReply, FastifyRequest } from "fastify";
import { AuthTypes } from "@transcendence/shared";
import { AuthService } from "../services/AuthService";

export class AuthController {
	private authService: AuthService;

	constructor() {
		this.authService = new AuthService();
	}

	async login(
		request: FastifyRequest<{ Body: AuthTypes.LoginData }>,
		reply: FastifyReply
	): Promise<void> {
		const { email, password } = request.body;

		const result = await this.authService.login(email, password);

		if (!result) {
			return reply.code(401).send({
				error: 'Unauthorized',
				message: 'Credenciales inválidas'
			});
		}

		return reply.code(200).send(result);
	}

	async updatePassword(
		request: FastifyRequest<{Body: AuthTypes.UpdatePasswordBody}>,
		reply: FastifyReply
	): Promise<void> {

		try {
			const userId = request.user?.id;

			if (!userId) {
				return reply.code(401).send({
					error: 'Unauthorized',
					message: 'Usuario no autenticado'
				});
			}
			
			const { oldPassword, newPassword } = request.body;
			
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