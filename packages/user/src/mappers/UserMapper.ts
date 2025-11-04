import { Types, UserRow } from '@transcendence/shared';

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
	
	/**
	* SQLite Row to Domain Entity, CON 'passwordHash'
	*/
	static rowToInternal(row: UserRow): Types.UserInternal {
		return {
			id: row.id,
			username: row.username,
			email: row.email,
			avatar: row.avatar,
			passwordHash: row.password_hash,
			isOnline: row.is_online === 1,
			createdAt: new Date(row.created_at).toISOString(),
			updatedAt: new Date(row.updated_at).toISOString()
		};
	}
	
	/**
	* SQLite Row to Domain Entity, SIN 'passwordHash'
	*/
	static rowToResponse(row: UserRow): Types.UserPublic {
		const { passwordHash, ...response } = this.rowToInternal(row);
		return response;
	}
	
	/**
	* Domain Entity to DB Row, SIN 'passwordHash'
	*/
	static internalToResponse(user: Types.UserInternal): Types.UserPublic {
		const { passwordHash, ...response } = user;
		return response;
	}
	
	/**
	* Domain Entity to DB Row, para INSERT\
	* Necesita un User CON 'passwordHash'\
	* @alert Un User.Response no lo tiene!
	*/
	static internalToRow(user: Types.UserInternal) {
		return {
			id: user.id,
			username: user.username,
			email: user.email,
			password_hash: user.passwordHash,
			avatar: user.avatar,
			is_online: user.isOnline ? 1 : 0,
			created_at: new Date(user.createdAt).getTime(),
			updated_at: new Date(user.updatedAt).getTime()
		};
	}
	
	/**
	* Update Data to Partial DB Row\
	* Puede no estar completo, el Update tiene todo campos opcionales\
	* Convierte solo los campos presentes
	*/
	static updateToRow(data: Types.UpdateUserBody): Partial<UserRow> {
		const update: Partial<UserRow> = {};
		
		if (data.username !== undefined) update.username = data.username;
		if (data.avatar !== undefined) update.avatar = data.avatar;
		if (data.email !== undefined) update.email = data.email;
		
		return update;
	}
}