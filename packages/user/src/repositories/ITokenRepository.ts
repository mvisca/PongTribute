import { AuthTypes, UserTypes } from "@transcendence/shared";

export interface ITokenRepository {
	createToken(data: AuthTypes.RefreshTokenData): Promise<AuthTypes.RefreshTokenRecord>;

	findByTokenHash(tokenHash: string): Promise<AuthTypes.RefreshTokenRecord>;
	
	deleteByUserId(userId: string): Promise<void>;
	
	cleanExpired(): Promise<void>;
}