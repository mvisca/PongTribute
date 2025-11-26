import { Utils, UserTypes, UserConstants } from "@transcendence/shared";
import { getDatabase, UserMapper } from "../index.js";
import { IUserRepository } from './IUserRepository.js';

export class SQLiteUserRepository implements IUserRepository {
	
	private db = getDatabase();

	/** 
	* Buscar un usuario por su ID
	*/
	private getUserById(id: string): UserTypes.UserPublic | null {
		const row = this.db.prepare(`
			SELECT * FROM users WHERE id = ?
		`).get(id) as UserTypes.UserRow | undefined;
			
		return row ? UserMapper.rowToResponse(row) : null;
	}
	
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
			id: Utils.generateUserId(),
			username: Utils.UserNormalizer.usernameForStorage(data.username),
			email: Utils.UserNormalizer.email(data.email),
			passwordHash: data.passwordHash,
			avatar: data.avatar ?? UserConstants.DEFAULT_AVATAR, // TODO asume front sirve /public/avatars/default.png
			isOnline: false,
			isDeleted: false,
			has2FAEnabled: false,
			createdAt: now,
			updatedAt: now
		};
		
		const row = UserMapper.internalToRow(newUser);
		
		this.db.prepare(`
			INSERT INTO users (id, username, email, password_hash, avatar, is_online, is_deleted, has_2fa_enabled, created_at, updated_at)
			VALUES (@id, @username, LOWER(@email), @password_hash, @avatar, @is_online, @is_deleted, @has_2fa_enabled, @created_at, @updated_at)
		`).run(row);
			
		const created = this.getUserById(row.id);
			
		if (!created) throw new Error(`No se ha podido recuperar usuario: ${UserMapper.internalToResponse(newUser)}`);
			
		return created;
	}
		
	/** 
	* Actualizar usuario
	*/
	async update(id: string, data: UserTypes.UpdateUserBody): Promise<UserTypes.UserPublic | null> {
		
		// Normalizar
		const updateData: UserTypes.UpdateUserBody = {};
		if (data.username) updateData.username = Utils.UserNormalizer.usernameForStorage(data.username) || undefined;
		if (data.email) updateData.email = Utils.UserNormalizer.email(data.email) || undefined;
		if (data.avatar) updateData.avatar = Utils.UserNormalizer.avatar(data.avatar) || undefined;
		
		// Validar que haya campos con valores válidos para actualizar
		if (Object.values(updateData).filter(v => v !== undefined).length === 0) {
			throw new Error('No hay campos válidos para actualizar');
		}
			
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
		if (restult.changes === 0) throw new Error(`Usuario ${id} no encontrado`);
			
		const updated = this.getUserById(id);
				
		if (!updated) throw new Error(`No se ha podido recuperar usuario: ${id}`);
		
		return updated;
	}
			
	/** 
	* Actualiza la contraseña (hash) de un usuario
	*/
	async updatePassword(id: string, newPasswordHash: string): Promise<UserTypes.UserPublic | null> {
		this.db.prepare(`
			UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?
		`).run(newPasswordHash, Date.now(), id);

		const updated = this.findByEmail(id);

		if (!updated) throw new Error(`No se ha podido recuperar usuario: ${id}`)

		return updated;
	}

	/** 
	* Elimina un usuario por su ID
	*/
	async delete(id: string): Promise<void> {
		this.db.prepare(`
			DELETE FROM users WHERE id = ?
		`).run(id);
	}

	/** 
	* Anonimiza el usuario por su ID
	*/
	async anonymize(id: string): Promise<UserTypes.UserPublic | null> {
		const now = Date.now();
		const anonName = `anon_${now}`;
		const restult = this.db.prepare(`
			UPDATE users SET
			username = ?, email = ?, avatar = ?, updated_at = ?, is_deleted = ?, is_online = ?, has_2fa_enabled = ?
			WHERE id = ?
		`).run(anonName, `${anonName}@deleted.email`, `${UserConstants.ANON_AVATAR}`, now, 1, 0, 0, id);

		if (restult.changes === 0) throw new Error(`No se ha podido modificar el record: ${id}`);

		const anonymized = this.findById(id);

		if (!anonymized) throw new Error(`No se ha podido recuperar el usuario: ${id}`);
	
		return anonymized;
	}
	
	/** 
	* Busca y retorna un usuario por ID (sin password_hash)
	*/
	async findById(id: string): Promise<UserTypes.UserPublic | null> {
		return this.getUserById(id) || null;
	}
	
	async findByIdInternal(id: string): Promise<UserTypes.UserInternal | null> {
		const row = this.db.prepare(`
			SELECT * FROM users WHERE id = ?
		`).get(id) as UserTypes.UserRow | undefined;
			
		return row ? UserMapper.rowToInternal(row) : null;
	}


	/** 
	* Busca usuario por email (insensible a mayúsculas)\
	* Retorna el objeto completo con passwordHash
	*/
	async findByEmail(email: string): Promise<UserTypes.UserInternal | null> {
		const normalizedEmail = Utils.UserNormalizer.email(email);
		
		const row = this.db.prepare(`
			SELECT * FROM users WHERE LOWER(email) = ?
		`).get(normalizedEmail) as UserTypes.UserRow | undefined;
							
		return row ? UserMapper.rowToInternal(row) : null;
	}
	
	/**
	* Busca usuario por nombre de usuario (insensible a mayúsculas)\
	* Retorna el objeto sin password_hash
	*/
	async findByUsername(username: string): Promise<UserTypes.UserPublic | null> {
		const normalizedUsername = Utils.UserNormalizer.usernameForSearch(username);
		
		const row = this.db.prepare(`
			SELECT * FROM users WHERE LOWER(username) = ?
		`).get(normalizedUsername) as UserTypes.UserRow | undefined;
				
		return row ? UserMapper.rowToResponse(row) : null;
	}
							
	/** 
	* Verifica si un nombre de usuario ya está en uso
	*/
	async isUsernameTaken(username: string): Promise<boolean> {
		const normalizedUsername = Utils.UserNormalizer.usernameForSearch(username);
								
		const isUsername = this.db.prepare(`
			SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(username) = ? AND is_deleted = '0') AS taken
		`).get(normalizedUsername) as { taken: number };
									
		return isUsername.taken ? true : false;
	}
					
	/** 
	* Verifica si un email ya está registrado
	*/
	async isEmailTaken(email: string): Promise<boolean> {
		const normalizedEmail = Utils.UserNormalizer.email(email);
		
		const isEmail = this.db.prepare(`
			SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(email) = ? AND is_deleted = '0') AS taken
		`).get(normalizedEmail) as { taken: number };
	
		return isEmail.taken ? true : false;
	}
									
	/** 
	* Cambia el estado de conexión (`is_online`) del usuario.
	* Retorna el usuario actualizado sin `password_hash`.
	*/
	async setOnlineStatus(id: string, isOnline: boolean): Promise<UserTypes.UserPublic | null> {
		const row = this.db.prepare(`
			UPDATE users SET is_online = ?, updated_at = ? WHERE id = ?
		`).run(isOnline ? 1 : 0, Date.now(), id);
									
		if (row.changes === 0) throw new Error(`Usuario ${id} sin cambios`);
									
		return this.getUserById(id) || null;
	}

	/**
	* Cambia el estado de 2FA (`is_2fa:enabled`) del usuario.
	* Retorna el usuario actualizado sin `password_hash`.
	*/
	async setIs2FAEnabled(id: string, is2FAEnabled: boolean): Promise<UserTypes.UserPublic | null> {
		const row = this.db.prepare(`
			UPDATE users SET is_2fa_enabled = ?, updated_at = ? WHERE id = ?
		`).run(is2FAEnabled ? 1 : 0, Date.now(), id);
									
		if (row.changes === 0) throw new Error(`Usuario ${id} sin cambios`);
									
		return this.getUserById(id) || null;
	}
}