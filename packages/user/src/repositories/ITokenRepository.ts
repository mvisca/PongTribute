import { AuthTypes, UserTypes } from "@transcendence/shared";

export interface ITokenRepository {
	createToken(data: AuthTypes.RefreshTokenDataBody): Promise<AuthTypes.RefreshTokenRecord>;
	findByTokenHash(tokenHash: AuthTypes.VerifyRefreshTokenBody): Promise<AuthTypes.RefreshTokenRecord | null>;
	deleteByUserId(userId: AuthTypes.DeleteRefreshTokenByUserParams): Promise<void>;
	cleanExpired(): Promise<void>;
}