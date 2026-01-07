import { Utils, UserTypes, UserConstants, SharedErrors } from "@transcendence/shared";
import { getDatabase, UserMapper } from "../index.js";
import { IUserRepository } from './IUserRepository.js';
import { UserEnv } from '../config.js';

export class SQLiteUserRepository implements IUserRepository {
	
	private db = getDatabase();
	

	// ========================================================================
	// MUTATIONS - Lanzan excepción si fallan
	// ========================================================================

	/** 
	* Crea un nuevo usuario\
	* Responsbilidad:\
	* - Generar ID y timestamp\
	* - Normalizar datos\
	* - Almacenar
	*/
	async create(data: UserTypes.CreateUserBody): Promise<UserTypes.UserPublic> {
		const now = new Date().toISOString();
		
		const newUser: UserTypes.UserInternal = {
			id: data.id,
			username: Utils.UserNormalizer.usernameForStorage(data.username),
			email: Utils.UserNormalizer.email(data.email),
			avatar: data.avatar ?? UserEnv.CLOUDINARY_DEFAULT_AVATAR, // TODO pendiente de implementar feature de avatares en USER , asume front sirve /public/avatars/default.png
			passwordHash: data.passwordHash,
			isOnline: false,
			isDeleted: false,
			has2FAEnabled: false,
			totpSecret: undefined,
			createdAt: now,
			updatedAt: now
		};
		
		const row = UserMapper.internalToRow(newUser);

		// omite 'has2FAEnabled' & 'totpSecret' campos para que se use el valor default de la tabla
		this.db.prepare(`
			INSERT INTO users (
				id, username, email, password_hash, avatar,
				is_online, is_deleted, created_at, updated_at)
			VALUES (
				@id, @username, LOWER(@email), @password_hash, @avatar,
				@is_online, @is_deleted, @created_at, @updated_at)
		`).run(row);

		const created = await this.findUserById(row.id);
			
		if (!created)
			throw new Error(`No se ha podido recuperar usuario: ${UserMapper.internalToResponse(newUser)}`);
			
		return created;
	}
		
	/** Actualizar usuario, lanza NotFoundError si no existe */
	async update(id: string, data: UserTypes.UpdateUserBody): Promise<UserTypes.UserPublic> {
		// Normalizar
		const updateData: UserTypes.UpdateUserBody = {};

		if (data.username)
			updateData.username = Utils.UserNormalizer.usernameForStorage(data.username) || undefined;

		if (data.email)
			updateData.email = Utils.UserNormalizer.email(data.email) || undefined;

		if (data.avatar)
			updateData.avatar = Utils.UserNormalizer.avatar(data.avatar) || undefined;
		
		// Validar que haya campos con valores válidos para actualizar
		if (Object.values(updateData).filter(v => v !== undefined).length === 0)
			throw new Error('No hay campos válidos para actualizar');

		// Mapea a row
		const updateRow = UserMapper.updateToRow(updateData);
			
		// Preparación de campos dinamicos para el UPDATE ... SET
		// Genera string[] a partir de keys(updateRow) y le agrega 'updated_at'
		// Convierte ['username', 'email', 'avatar', 'updated_at'] >> ["username = ?", "email = ?", "avatar = ?", "updated_at = ?"]
		// Convierte ["username = ?", "email = ?", "avatar = ?", "updated_at = ?"] >> ["username = ?, email = ?, avatar = ?, updated_at = ?"]
		const setFields = [ ...Object.keys(updateRow), 'updated_at' ]
			.map( key => `${key} = ?` )
			.join(', ');
			
		const now = new Date().getTime();
			
		const valuesToUpdate = [ ...Object.values(updateRow), now, id ];
			
		const restult = this.db.prepare(`
			UPDATE users SET ${setFields} WHERE id = ?
		`).run(...valuesToUpdate);
				
		// Verficar update
		if (restult.changes === 0)
			throw new SharedErrors.NotFoundError(`Usuario ${id} no encontrado`, 'user');
			
		const updated = await this.findUserById(id);
				
		if (!updated)
			throw new Error(`No se ha podido recuperar usuario: ${id}`);
		
		return updated;
	}
			
	/** Actualiza la contraseña (hash), lanza NotFoundError si no existe */
	async updatePassword(id: string, newPasswordHash: string): Promise<UserTypes.UserPublic> {
		const result = this.db.prepare(`
			UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?
		`).run(newPasswordHash, Date.now(), id);

		if (result.changes === 0)
			throw new SharedErrors.NotFoundError(`No se ha encontrado el usuario: ${id }`, 'user');

		const updated = await this.findUserById(id);

		if (!updated)
			throw new SharedErrors.NotFoundError(`No se ha podido recuperar usuario: ${id}`, 'user');

		return updated;
	}

	/** Elimina un usuario por su ID */
	async delete(id: string): Promise<void> {
		const result = this.db.prepare(`
			DELETE FROM users WHERE id = ?
		`).run(id);

		if (result.changes === 0)
			throw new SharedErrors.NotFoundError(`No se ha encontrado el usuario: ${id}`, 'user');
	}

	/** Anonimiza el usuario por su ID, lanza NotFoundError si no existe */
	async anonymize(id: string): Promise<UserTypes.UserPublic> {
		const now = Date.now();
		const anonName = `anon_${now}`;

		const restult = this.db.prepare(`
			UPDATE users SET
				username = ?,
				email = ?,
				avatar = ?,
				updated_at = ?,
				is_deleted = ?,
				is_online = ?,
				has_2fa_enabled = ?
			WHERE id = ?
		`).run(
			anonName,
			`${anonName}@deleted.email`,
			`${UserConstants.ANON_AVATAR}`,
			now,
			1,
			0,
			0,
			id
		);

		if (restult.changes === 0)
			throw new SharedErrors.NotFoundError(`No se ha podido modificar el record: ${id}`, 'user');

		const anonymized = await this.findUserById(id);

		if (!anonymized)
			throw new Error(`No se ha podido recuperar el usuario: ${id}`); // TODO en campos de verificacion de recuperacion de usuario modificado, es notfounderror o Error para tirar un 500?
			// TODO si es 500 hay que revisar otros metodos en ese repository
		return anonymized;
	}

	/** 
	* Cambia el estado de conexión (`is_online`) del usuario.
	* Retorna el usuario actualizado sin `password_hash`.
	*/
	async setOnlineStatus(id: string, isOnline: boolean): Promise<UserTypes.UserPublic> {
		const result = this.db.prepare(`
			UPDATE users SET is_online = ?, updated_at = ? WHERE id = ?
		`).run(isOnline ? 1 : 0, Date.now(), id);
									
		if (result.changes === 0)
			throw new SharedErrors.NotFoundError(`Usuario ${id} sin cambios`, 'user');

		const updated = await this.findUserById(id);

		if (!updated)
			throw new Error(`No se ha podido recuperar el usuario: ${id}`);

		return updated;
	}
	
	/** Actualiza estado 2FA, lanza NotFoundError si no existe */
	async update2FAStatus(
		userId: string, 
		totpSecret: string | null, 
		backupCodeHash: string | null,
		has2FAEnabled: boolean
	): Promise<UserTypes.UserPublic> {
		const result = this.db.prepare(`
			UPDATE users
			SET
				totp_secret = ?,
				backup_code_hash = ?,
				has_2fa_enabled = ?,
				updated_at = ?
			WHERE id = ?
		`).run(
			totpSecret,
			backupCodeHash,
			has2FAEnabled,
			Date.now(),
			userId
		);

		const updated = await this.findUserById(userId);

		if (!updated)
			throw new Error(`No se ha podido recuperar el usuario: ${userId}`);

		return updated;
	}

	// ========================================================================
	// QUERIES - Retornan null si no encuentran
	// ========================================================================

	/** Busca por ID y retorna usuario public (sin campos privados) */
	async findUserById(id: string): Promise<UserTypes.UserPublic | null> {
		const row = this.db.prepare(`
			SELECT * FROM users WHERE id = ?
		`).get(id) as UserTypes.UserRow | undefined;

		return row ? UserMapper.rowToResponse(row) : null;
	}

	/** Busca por ID y retorna usuario internal (con campos privados) */
	async findUserByIdInternal(id: string): Promise<UserTypes.UserInternal | null> {
		const row = this.db.prepare(`
			SELECT * FROM users WHERE id = ?
		`).get(id) as UserTypes.UserRow | undefined;
			
		return row ? UserMapper.rowToInternal(row) : null;
	}

	/** Busca por EMAIL y retorna usuario public (sin campos privados) */
	async findUserByEmail(email: string): Promise<UserTypes.UserInternal | null> {
		const normalizedEmail = Utils.UserNormalizer.email(email);
		
		const row = this.db.prepare(`
			SELECT * FROM users WHERE LOWER(email) = ?
		`).get(normalizedEmail) as UserTypes.UserRow | undefined;
							
		return row ? UserMapper.rowToInternal(row) : null;
	}

	/** Busca por EMAIL y retorna usuario internal (con campos privados) */
	async findUserByEmailInternal(email: string): Promise<UserTypes.UserInternal | null> {
		const normalizedEmail = Utils.UserNormalizer.email(email);
		const row = this.db.prepare(`
			SELECT * FROM users WHERE LOWER(email) = ?
		`).get(normalizedEmail) as UserTypes.UserRow | undefined;
		return row ? UserMapper.rowToInternal(row) : null;
	}
	
	/** Busca por USERNAME y retorna usuario public (sin campos privados) */
	async findUserByUsername(username: string): Promise<UserTypes.UserPublic | null> {
		const normalizedUsername = Utils.UserNormalizer.usernameForSearch(username);
		
		const row = this.db.prepare(`
			SELECT * FROM users WHERE LOWER(username) = ?
		`).get(normalizedUsername) as UserTypes.UserRow | undefined;
				
		return row ? UserMapper.rowToResponse(row) : null;
	}

	// ========================================================================
	// CHECKERS - Retornan siempre un valor
	// ========================================================================

	/** Verifica si un nombre de usuario ya está en uso */
	async isUsernameTaken(username: string): Promise<boolean> {
		const normalizedUsername = Utils.UserNormalizer.usernameForSearch(username);
								
		const isUsername = this.db.prepare(`
			SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(username) = ? AND is_deleted = '0') AS taken
		`).get(normalizedUsername) as { taken: number };
									
		return isUsername.taken ? true : false;
	}
					
	/** Verifica si un email ya está registrado */
	async isEmailTaken(email: string): Promise<boolean> {
		const normalizedEmail = Utils.UserNormalizer.email(email);
		
		const isEmail = this.db.prepare(`
			SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(email) = ? AND is_deleted = '0') AS taken
		`).get(normalizedEmail) as { taken: number };
	
		return isEmail.taken ? true : false;
	}
}