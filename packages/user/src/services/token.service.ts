import { AuthTypes } from "@transcendence/shared";
import { ITokenRepository } from "src/repositories/ITokenRepository.js";
import { SQLiteTokenRepository } from "src/repositories/SQLiteTokenRepository.js";

export class TokenService {
	private tokenRepo: ITokenRepository;

	constructor() {
		this.tokenRepo = new SQLiteTokenRepository();
	}

	async createToken(data: AuthTypes.RefreshTokenDataBody): Promise<AuthTypes.RefreshTokenRecord> {
		if (new Date(data.expiresAt).getTime() < Date.now())
			throw new Error(`Fecha de expiración inválida`);

		return await this.tokenRepo.createToken(data);
	}

	async verifyToken(tokenHash: AuthTypes.VerifyRefreshTokenBody): Promise<AuthTypes.RefreshTokenResponseBody | null> {
		const token = await this.tokenRepo.findByTokenHash(tokenHash);

		return token ? token : null;
	}

	async deleteUserTokens(userId: AuthTypes.DeleteRefreshTokenByUserParams): Promise<void> {
		await this.tokenRepo.deleteByUserId(userId);
	}

	async cleanExpired(): Promise<void> {
		await this.tokenRepo.cleanExpired();
	}
}