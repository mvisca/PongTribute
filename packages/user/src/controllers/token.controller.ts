import { FastifyReply, FastifyRequest } from "fastify";
import { AuthTypes, SharedErrors } from "@transcendence/shared";
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
				return SharedErrors.handleError(err, reply);
		}
	}
	
	async createToken(
		request: FastifyRequest<{Body: AuthTypes.RefreshTokenData}>, reply: FastifyReply): Promise<void> {
			try {
				const data = request.body;
				const token = await this.tokenService.createToken(data);

				return reply.code(201).send(token);

			} catch(err) {
				return SharedErrors.handleError(err, reply);
			}
		}
		
		async deleteByUserId(request: FastifyRequest, reply: FastifyReply): Promise<void> {
			try {
				const id = request.params as AuthTypes.DeleteRefreshTokenByUserParams;
				await this.tokenService.deleteUserTokens(id);
				
				return reply.code(204).send();

			} catch(err) {
				return SharedErrors.handleError(err, reply);
			}
		}
		
		async cleanExpired(request: FastifyRequest, reply: FastifyReply): Promise<void> {
			try {
				await this.tokenService.cleanExpired();

				return reply.code(204).send();
				
			} catch(err) {
				return SharedErrors.handleError(err, reply);
			}
		}
	}