import { UserTypes } from '@transcendence/shared';

/**
* @class UserMapper\
* Responsable de transformar estructuras entre SQLite y tipos de Dominio (Typeox) \
* Transformaciones:
* - snake_case ↔ camelCase
* - number timestamps ↔ ISO string dates
* - 1/0 ↔ boolean
* - password_hash ↔ passwordHash
*/
export class UserMapper {
	
	/** SQLite Row to Domain Entity, CON 'passwordHash' */
	static rowToInternal(row: UserTypes.UserRow): UserTypes.UserInternal {
		return {
			id: row.id,
			username: row.username,
			email: row.email,
			avatar: row.avatar,
			passwordHash: row.password_hash,
			isOnline: row.is_online === 1,
			isDeleted: row.is_deleted === 1,
			has2FAEnabled: row.has_2fa_enabled === 1,
			is2FAVerified: row.is_2fa_verified === 1,
			totpSecret: row.totp_secret ?? undefined,
			backupCodeHash: row.backup_code_hash ?? undefined,
			lastLogoutAt: new Date(row.last_logout_at).toISOString(),
			createdAt: new Date(row.created_at).toISOString(),
			updatedAt: new Date(row.updated_at).toISOString()
		};
	}
	
	/**
	* SQLite Row to Domain Entity, SIN 'passwordHash'
	*/
	static rowToResponse(row: UserTypes.UserRow): UserTypes.UserPublic {
		const { passwordHash, ...response } = this.rowToInternal(row);
		return response;
	}
	
	/**
	* Domain Entity to DB Row, SIN 'passwordHash'
	*/
	static internalToResponse(user: UserTypes.UserInternal): UserTypes.UserPublic {
		const { passwordHash, ...response } = user;
		return response;
	}
	
	/**
	* Domain Entity to DB Row, para INSERT\
	* Necesita un User CON 'passwordHash'\
	* @alert Un User.Response no lo tiene!
	*/
	static internalToRow(user: UserTypes.UserInternal) {
		return {
			id: user.id,
			username: user.username,
			email: user.email,
			avatar: user.avatar,
			password_hash: user.passwordHash,
			is_online: user.isOnline ? 1 : 0,
			is_deleted: user.isDeleted ? 1 : 0,
			has_2fa_enabled: user.has2FAEnabled ? 1 : 0,
			totp_secret: user.totpSecret ?? null,
			backup_code_hash: user.backupCodeHash ?? null,
			last_logout_at: new Date(user.lastLogoutAt).getTime(),
			created_at: new Date(user.createdAt).getTime(),
			updated_at: new Date(user.updatedAt).getTime()
		};
	}
	
	/**
	* Update Data to Partial DB Row\
	* Puede no estar completo, el Update tiene todo campos opcionales\
	* Convierte solo los campos presentes
	*/
	static updateToRow(data: UserTypes.UpdateUserBody): Partial<UserTypes.UserRow> {
		const update: Partial<UserTypes.UserRow> = {};
		
		if (data.username !== undefined) update.username = data.username;
		if (data.avatar !== undefined) update.avatar = data.avatar;
		if (data.email !== undefined) update.email = data.email;
		
		return update;
	}
}