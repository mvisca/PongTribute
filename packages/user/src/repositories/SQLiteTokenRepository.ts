import { AuthTypes, SharedErrors, UserTypes, Utils } from "@transcendence/shared";
import { getDatabase, TokenMapper } from "../index.js"
import { ITokenRepository } from "./ITokenRepository.js";

export class SQLiteTokenRepository implements ITokenRepository{

	private db = getDatabase();

	async createToken(data: AuthTypes.RefreshTokenDataBody): Promise<AuthTypes.RefreshTokenRecord> {

		const now = new Date().toISOString();
		const fullData: AuthTypes.RefreshTokenRecord = {
			id: Utils.generateTokenId(),
			...data,
			createdAt: now
		};

		const row = TokenMapper.domainToRow(fullData);

		const res = this.db.prepare(`
			INSERT INTO refresh_tokens
			(id, user_id, token_hash, expires_at, is_2fa_verified, created_at)
			VALUES (?, ?, ?, ?, ?, ?)
		`).run(
			row.id,
			row.user_id,
			row.token_hash,
			row.expires_at,
			row.is_2fa_verified,
			row.created_at
		);

		if (res.changes == 0) {
			throw new Error('Token no creado en DB');
		}

		return fullData;
	}

	async findByTokenHash(tokenHash: string): Promise<AuthTypes.RefreshTokenRecord> {

		const row = this.db.prepare(`
			SELECT * FROM refresh_tokens WHERE token_hash = ?
		`).get(tokenHash) as AuthTypes.RefreshTokenRow | undefined;

		if (!row || row.expires_at < Date.now())
			throw new SharedErrors.UnauthorizedError('Token inválido');

		return TokenMapper.rowToDomain(row);
	}

	async deleteByUserId(userId: string): Promise<void> {
		const deleted = this.db.prepare(`
			DELETE FROM refresh_tokens WHERE user_id = ?
		`).run(userId);
	}

	async cleanExpired(): Promise<void> {
		const now = Date.now();
		this.db.prepare(`
			DELETE FROM refresh_tokens WHERE expires_at < ?
		`).run(now);
	}
}