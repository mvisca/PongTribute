import BetterSqlite3 from "better-sqlite3";
import { Email, UserId } from '@transcendence/shared';
import * as UserTypes from '@transcendence/shared';
import { IUserRepository } from './IUserRepository';
import { UserMapper } from '../mappers/UserMapper';
import { generateUserId } from '@transcendence/shared';

export class SQLiteUserRepository implements IUserRepository {
	
	constructor(private db: BetterSqlite3.Database) {}

	/** 
	 * Busca un usuario por su ID.
	 * Retorna el registro completo o null si no existe.
	 */
	private async getRowUserById(id: UserId): Promise<UserTypes.User | null> {
		const inserted = this.db.prepare(`SELECT * FROM users WHERE id = ?`);
		const selectedUser = inserted.get(id) as UserTypes.User | undefined;
		return selectedUser || null;
	}

	/** 
	 * Crea un nuevo usuario en la base de datos.
	 * - Genera ID y fechas.
	 * - Inserta en la tabla `users`.
	 * - Retorna el usuario recién creado sin el campo `password_hash`.
	 */
	async create(data: UserTypes.CreateUserData): Promise<UserTypes.UserResponse> {
		const now = new Date();
		const newUser: UserTypes.User = {
			id: generateUserId(),
			...data,
			isOnline: false,
			createdAt: now,
			updatedAt: now
		};
		
		const row = UserMapper.dataToInsert(newUser);

		this.db.prepare(`
			INSERT INTO users (
				id, username, email, password_hash,
				avatar, is_online, created_at, updated_at
			) VALUES (
				@id, LOWER(@username), LOWER(@email), @password_hash,
				@avatar, @is_online, @created_at, @updated_at
			)
		`).run(row);

		return UserMapper.rowToUserResponse(await this.getRowUserById(row.id));
	}

	/** 
	 * Actualiza campos de un usuario existente.
	 * Solo modifica las claves presentes en el objeto recibido.
	 */
	async update(userId: UserId, data: UserTypes.UserUpdate): Promise<UserTypes.UserResponse> {
		const validatedData = {};
		try {
			UserMapper.validateUpdate(data);
		} catch (error) {
			console.error(`Validación fallida: ${error}`);
			throw error;			
		}

		const mappedData = UserMapper.dataToSet(validatedData);
		const finalData = { ...mappedData, updated_at: Date.now() };

		const fields = Object.keys(finalData)
			.map(key => `${key} = @${key}`)
			.join(', ');

		this.db
			.prepare(`UPDATE users SET ${fields} WHERE id = @id`)
			.run({ ...finalData, userId });

		return UserMapper.rowToUserResponse(await this.getRowUserById(userId));
	}

	/** 
	 * Actualiza la contraseña (hash) de un usuario.
	 */
	async updatePassword(id: UserId, newPasswordHash: string): Promise<void> {
		this.db.prepare(`
			UPDATE users
			SET password_hash = ?, updated_at = ?
			WHERE id = ?
		`).run(newPasswordHash, Date.now(), id);
	}

	/** 
	 * Elimina un usuario por su ID.
	 */
	async delete(id: UserId): Promise<void> {
		this.db.prepare(`DELETE FROM users WHERE id = ?`).run(id);
	}

	/** 
	 * Busca y retorna un usuario por ID (sin password_hash).
	 */
	async findById(id: UserId): Promise<UserTypes.UserResponse | null> {
		const row = await this.getRowUserById(id);
		return row ? UserMapper.rowToUserResponse(row) : null;
	}

	/** 
	 * Busca usuario por email (insensible a mayúsculas).
	 * Retorna el objeto completo con password_hash.
	 */
	async findByEmail(email: Email): Promise<UserTypes.User | null> {
		const row = this.db
			.prepare(`SELECT * FROM users WHERE LOWER(email) = ?`)
			.get(email.toLowerCase());
		return row ? UserMapper.rowToUser(row) : null;
	}

	/** 
	 * Busca usuario por nombre de usuario (insensible a mayúsculas).
	 * Retorna el objeto sin password_hash.
	 */
	async findByUsername(username: string): Promise<UserTypes.UserResponse | null> {
		const row = this.db
			.prepare(`SELECT * FROM users WHERE LOWER(username) = ?`)
			.get(username.toLowerCase());
		return row ? UserMapper.rowToUserResponse(row) : null;
	}

	/** 
	 * Verifica si un nombre de usuario ya está en uso.
	 */
	async isUsernameTaken(username: string): Promise<boolean> {
		const user = this.db
			.prepare(`SELECT * FROM users WHERE LOWER(username) = ?`)
			.get(username.toLowerCase());
		return !!user;
	}

	/** 
	 * Verifica si un email ya está registrado.
	 */
	async isEmailTaken(email: Email): Promise<boolean> {
		const user = this.db
			.prepare(`SELECT * FROM users WHERE LOWER(email) = ?`)
			.get(email.toLowerCase());
		return !!user;
	}

	/** 
	 * Cambia el estado de conexión (`is_online`) del usuario.
	 * Retorna el usuario actualizado sin `password_hash`.
	 */
	async setOnlineStatus(id: UserId, isOnline: boolean): Promise<UserTypes.UserResponse> {
		this.db.prepare(`
			UPDATE users
			SET is_online = @is_online, updated_at = @updated_at
			WHERE id = @id
		`).run({ is_online: isOnline ? 1 : 0, updated_at: Date.now(), id });

		const targetUser = await this.getRowUserById(id);
		return UserMapper.rowToUserResponse(targetUser);
	}
}