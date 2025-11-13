import { FastifyReply, FastifyRequest } from "fastify";
import { AuthTypes } from "../schemas/authSchemas";
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
}