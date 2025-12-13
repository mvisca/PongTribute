import { FastifyReply, FastifyRequest } from "fastify";
import { AuthTypes } from "@transcendence/shared";
import { TokenService } from "../index.js";

export class TokenController {
	private tokenService: TokenService;

	constructor() {
		this.tokenService = new TokenService();
	}

	async verifyToken(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const tokenHash = request.body as AuthTypes.VerifyRefreshTokenBody;
			const refreshToken = await this.tokenService.verifyToken(tokenHash);

			if (!refreshToken) {
				return reply.code(404).send({
					error: 'Not Found',
					message: 'Token no encontrado o expirado'
				});
			}

			return reply.code(200).send(refreshToken);
			
		} catch(err) {
			const message = err instanceof Error ? err.message : 'Error desconocido'
			return reply.code(500).send({
				error: 'Internal Server Error',
				message
			});
		}
	}

	async createToken(
		request: FastifyRequest<{Body: AuthTypes.RefreshTokenData}>, reply: FastifyReply): Promise<void> {
		try {
			const data = request.body;
			const token = await this.tokenService.createToken(data);
			return reply.code(201)
				.send(token);
		} catch(err) {
			const message = err instanceof Error ? err.message : 'Error desconocido';
			return reply.code(500).send({
				error: 'Internal Server Error',
				message
			});
		}
	}

	async deleteByUserId(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const id = request.params as AuthTypes.DeleteRefreshTokenByUserParams;
			await this.tokenService.deleteUserTokens(id);
			return reply.code(204).send();
		} catch(err) {
			const message = err instanceof Error ? err.message : 'Error desconocido';
			return reply.code(500).send({
				error: 'Internal Server Error',
				message
			});
		}
	}

	async cleanExpired(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			await this.tokenService.cleanExpired();
			return reply.code(204).send();
		} catch(err) {
			const message = err instanceof Error ? err.message : 'Error desconocido';
			return reply.code(500).send({
				error: 'Internal Server Error',
				message
			});
		}
	}
}