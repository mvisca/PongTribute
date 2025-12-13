import { AuthTypes, SharedErrors } from "@transcendence/shared";
import { ITokenRepository } from "src/repositories/ITokenRepository.js";
import { SQLiteTokenRepository } from "src/repositories/SQLiteTokenRepository.js";

export class TokenService {
	private tokenRepo: ITokenRepository;

	constructor() {
		this.tokenRepo = new SQLiteTokenRepository();
	}

	async createToken(data: AuthTypes.RefreshTokenData): Promise<AuthTypes.RefreshTokenRecord> {
		if (new Date(data.expiresAt).getTime() < Date.now())
			throw new Error(`Fecha de expiración inválida`);

		return await this.tokenRepo.createToken(data);
	}

	async verifyToken(tokenHashObj: AuthTypes.VerifyRefreshTokenBody): Promise<AuthTypes.RefreshTokenRecord> {
		const token = await this.tokenRepo.findByTokenHash(tokenHashObj.tokenHash);

		if (!token) {
			throw new SharedErrors.UnauthorizedError('No autorizado');
		}

		return token;
	}

	async deleteUserTokens(userIdObj: AuthTypes.DeleteRefreshTokenByUserParams): Promise<void> {
		await this.tokenRepo.deleteByUserId(userIdObj.id);
	}

	async cleanExpired(): Promise<void> {
		await this.tokenRepo.cleanExpired();
	}
}