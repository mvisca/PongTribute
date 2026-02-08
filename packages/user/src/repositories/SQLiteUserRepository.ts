import { Utils, UserTypes, UserConstants, SharedErrors } from "@transcendence/shared";
import { getDatabase, UserMapper } from "../index.js";
import { IUserRepository } from './IUserRepository.js';
import { UserEnv } from '../config.js';
import { NotFoundError } from "@transcendence/shared/errors/AppError.js";

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
		const nowSeconds = Math.floor(Date.now() / 1000);
		
		const newUser: UserTypes.UserInternal = {
			id: data.id,
			username: Utils.UserNormalizer.usernameForStorage(data.username),
			email: Utils.UserNormalizer.email(data.email),
			avatar: Utils.UserNormalizer.avatar(data.avatar) || UserEnv.CLOUDINARY_DEFAULT_AVATAR(),
			passwordHash: data.passwordHash,
			isOnline: false,
			isDeleted: false,
			has2FAEnabled: false,
			is2FAVerified: false,
			totpSecret: undefined,
			createdAt: now,
			lastLogoutAt: nowSeconds,
			updatedAt: now
		};
		
		const row = UserMapper.internalToRow(newUser);

		// omite 'has2FAEnabled' & 'totpSecret' campos para que se use el valor default de la tabla
		this.db.prepare(`
			INSERT INTO users (
				id, username, email, password_hash, avatar,
				is_online, is_deleted, last_logout_at, created_at, updated_at)
			VALUES (
				@id, @username, LOWER(@email), @password_hash, @avatar,
				@is_online, @is_deleted, @last_logout_at, @created_at, @updated_at)
		`).run(row);

		const created = await this.findUserById(row.id);
			
		if (!created)
			throw new SharedErrors.NotFoundError(`No se ha podido recuperar usuario: ${UserMapper.internalToResponse(newUser)}`);
			
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

		if (data.avatar) {
			const normalizedAvatar = Utils.UserNormalizer.avatar(data.avatar);
			updateData.avatar = normalizedAvatar || UserEnv.CLOUDINARY_DEFAULT_AVATAR();
		}
		
		// Validar que haya campos con valores válidos para actualizar
		if (Object.values(updateData).filter(v => v !== undefined).length === 0)
			throw new SharedErrors.ValidationError('No hay campos válidos para actualizar', 'body');

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
	async updatePassword(id: string, passwordHash: string): Promise<UserTypes.UserPublic> {
		const result = this.db.prepare(`
			UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?
		`).run(passwordHash, Date.now(), id);

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
			throw new SharedErrors.NotFoundError(`No se ha podido recuperar el usuario: ${id}`);
		return anonymized;
	}

	/** 
	* Cambia el estado de conexión (`is_online`) del usuario.
	* Retorna el usuario actualizado sin `password_hash`.
	*/
	async setOnlineStatus(id: string, isOnline: boolean): Promise<UserTypes.UserPublic> {
		const result = this.db.prepare(`
			UPDATE users SET is_online = ?, updated_at = ? WHERE id = ?
		`).run(
			isOnline ? 1 : 0,
			Date.now(),
			id
		);
									
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
		has2FAEnabled: boolean,
		totpSecret?: string, 
		backupCodeHash?: string
	): Promise<UserTypes.UserPublic> {
		let finalTotpSecret: string | null;
		let finalBackupCodeHash: string | null;

		if (!has2FAEnabled) {
			finalTotpSecret = null;
			finalBackupCodeHash = null;
		} else {
			if (!totpSecret || !backupCodeHash) {
				throw new SharedErrors.ValidationError(
					'totpSecret y backupCodeHash son requeridos al activar 2FA',
					'2fa_credentials'
				);
			}

			finalTotpSecret = totpSecret;
			finalBackupCodeHash = backupCodeHash;
		}

		const result = this.db.prepare(`
			UPDATE users
			SET
				totp_secret = ?,
				backup_code_hash = ?,
				has_2fa_enabled = ?,
				updated_at = ?
			WHERE id = ?
		`).run(
			finalTotpSecret,
			finalBackupCodeHash,
			has2FAEnabled ? 1 : 0,
			Date.now(),
			userId
		);

		const updated = await this.findUserById(userId);

		if (!updated)
			throw new Error(
				`No se ha podido recuperar el usuario: ${userId}` +
				`Esto no debería pasar. Posible race condition o DB corrupta.`
			);

		return updated;
	}

	/** Actualizar lastLogoutAt para caducar tokens de acceso*/
	async updateLastLogoutAt(userId: string, lastLogoutAt: number): Promise<void> {
		const last_logout_at = new Date(lastLogoutAt).getTime();
		const now = Date.now();

		const result = this.db.prepare(`
			UPDATE users
			SET
				last_logout_at = ?,
				updated_at = ?
			WHERE id = ?
		`).run(
			last_logout_at,
			now,
			userId
		);

		if (result.changes === 0) {
			throw new SharedErrors.NotFoundError(`Usuario ${userId} sin cambios`, 'user');
		}
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

	async getLastLogoutAt(userId: string): Promise<number | null> {
		const result = this.db.prepare(`
			SELECT last_logout_at FROM users WHERE id = ?
		`).get(userId) as { last_logout_at: number } | undefined; // TODO tipar con typo específico??

		return result ? result.last_logout_at : null;
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