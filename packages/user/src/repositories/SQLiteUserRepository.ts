import BetterSqlite3 from "better-sqlite3";
import bcrypt from 'bcryptjs';
import { IUserRepository } from './IUserRepository';
import { UserMapper } from '../mappers/UserMapper';
import { Utils, Types, UserRow } from "@transcendence/shared";

export class SQLiteUserRepository implements IUserRepository {
	
	constructor(private db: BetterSqlite3.Database) {}
	
	/** 
	* Buscar un usuario por su ID
	*/
	private getUserById(id: string): Types.UserPublic | null {
		const row = this.db.prepare(`
			SELECT * FROM users WHERE id = ?
		`).get(id) as UserRow | undefined;

		return row ? UserMapper.rowToResponse(row) : null;
	}
	
	/** 
	* Crea un nuevo usuario\
	* Responsbilidad:\
	* - Generar ID y timestamp\
	* - Normalizar datos\
	* - Almacenar
	*/
	async create(data: Types.CreateUserBody): Promise<Types.UserPublic> {
		const now = new Date().toISOString();

		const newUser: Types.UserInternal = {
			id: Utils.generateUserId(),
			username: Utils.UserNormalizer.usernameForStorage(data.username),
			email: Utils.UserNormalizer.email(data.email),
			passwordHash: bcrypt.hashSync(data.password),
			avatar: data.avatar,
			isOnline: false,
			createdAt: now,
			updatedAt: now
		};
		
		const row = UserMapper.internalToRow(newUser);
		
		this.db.prepare(`
			INSERT INTO users (id, username, email, password_hash, avatar, is_online, created_at, updated_at)
			VALUES (@id, @username, LOWER(@email), @password_hash, @avatar, @is_online, @created_at, @updated_at)
		`).run(row);

		const created = this.getUserById(row.id);

		if (!created) throw new Error(`No se ha podido recuperar usuario: ${UserMapper.internalToResponse(newUser)}`);

		return created;
	}
		
	/** 
	* Actualizar usuario
	*/
	async update(id: string, data: Types.UpdateUserBody): Promise<Types.UserPublic | null> {
		
		// Normalizar
		const updateData: Types.UpdateUserBody = {};
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
		const keysToUpdate = [ ...Object.keys(updateRow), 'updated_at' ]
			.map( key => `${key} = ?` )
			.join(', ');
		const setFields = keysToUpdate
		
		const now = new Date().getTime();
		
		const valuesToUpdate = [ ...Object.values(updateRow), now, id ];
		
		const restult = this.db.prepare(`
			UPDATE users SET ${setFields} WHERE id = ?
		`).run(...valuesToUpdate);
		
		// Verficar update
		if (restult.changes === 0) throw new Error(`Usuario ${id} no encontrado`);

		const updated = this.getUserById(id);

		if (!updated) throw new Error(`No se ha podido recuperar usuario: ${id}`);

		return updated ? updated : null;
	}
		
	/** 
	* Actualiza la contraseña (hash) de un usuario
	*/
	async updatePassword(id: string, newPasswordHash: string): Promise<void> {
		this.db.prepare(`
			UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?
		`).run(newPasswordHash, Date.now(), id);
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
	* Busca y retorna un usuario por ID (sin password_hash)
	*/
	async findById(id: string): Promise<Types.UserPublic | null> {
		return this.getUserById(id) || null;
	}

	/** 
	* Busca usuario por email (insensible a mayúsculas)\
	* Retorna el objeto completo con passwordHash
	*/
	async findByEmail(email: string): Promise<Types.UserInternal | null> {
		const normalizedEmail = Utils.UserNormalizer.email(email);

		const row = this.db.prepare(`
			SELECT * FROM users WHERE LOWER(email) = ?
		`).get(normalizedEmail) as UserRow | undefined;

		return row ? UserMapper.rowToInternal(row) : null;
	}
 
	/**
	* Busca usuario por nombre de usuario (insensible a mayúsculas)\
	* Retorna el objeto sin password_hash
	*/
	async findByUsername(username: string): Promise<Types.UserPublic | null> {
		const normalizedUsername = Utils.UserNormalizer.usernameForSearch(username);

		const row = this.db.prepare(`
			SELECT * FROM users WHERE LOWER(username) = ?
		`).get(normalizedUsername) as UserRow | undefined;

		return row ? UserMapper.rowToResponse(row) : null;
	}

	/** 
	* Verifica si un nombre de usuario ya está en uso
	*/
	async isUsernameTaken(username: string): Promise<boolean> {
		const normalizedUsername = Utils.UserNormalizer.usernameForSearch(username);

		const isUsername = this.db.prepare(`
			SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(username) = ?) AS taken
		`).get(normalizedUsername) as { taken: number };

		return isUsername.taken ? true : false;
	}
	
	/** 
	* Verifica si un email ya está registrado
	*/
	async isEmailTaken(email: string): Promise<boolean> {
		const normalizedEmail = Utils.UserNormalizer.email(email);

		const isEmail = this.db.prepare(`
			SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(email) = ?) AS taken
		`).get(normalizedEmail) as { taken: number };
		
		return isEmail.taken ? true : false;
	}
			
	/** 
	* Cambia el estado de conexión (`is_online`) del usuario.
	* Retorna el usuario actualizado sin `password_hash`.
	*/
	async setOnlineStatus(id: string, isOnline: boolean): Promise<Types.UserPublic | null> {
		const row = this.db.prepare(`
			UPDATE users SET is_online = ?, updated_at = ? WHERE id = ?
		`).run(isOnline ? 1 : 0, Date.now(), id);
		
		if (row.changes === 0) throw new Error(`Usuario ${id} sin cambios`);

		return this.getUserById(id) || null;
	}
}