import { AuthTypes } from "@transcendence/shared";

export class TokenMapper {

	static rowToDomain(
		row: AuthTypes.RefreshTokenRow
	): AuthTypes.RefreshTokenRecord {
		return {
			id: row.id,
			userId: row.user_id,
			tokenHash: row.token_hash,
			expiresAt: new Date(row.expires_at).toISOString(),
			is2FAVerified: row.is_2fa_verified === 1,
			createdAt: new Date(row.created_at).toISOString()
		};
	}

	static domainToRow(
		token: AuthTypes.RefreshTokenRecord
	): AuthTypes.RefreshTokenRow {
		return {
			id: token.id,
			user_id: token.userId,
			token_hash: token.tokenHash,
			expires_at: new Date(token.expiresAt).getTime(),
			is_2fa_verified: token.is2FAVerified ? 1 : 0,
			created_at: new Date(token.createdAt).getTime()
		}
	}
}