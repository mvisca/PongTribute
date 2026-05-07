import { Utils, UserTypes, UserConstants, SharedErrors, AuthTypes } from "@transcendence/shared";
import { getDatabase, UserMapper } from "../index.js";
import { IUserRepository } from './IUserRepository.js';
import { UserEnv } from '../config.js';
import { NotFoundError } from "@transcendence/shared/errors/AppError.js";

export class SQLiteUserRepository implements IUserRepository {
	
	private db = getDatabase();
	

	// ========================================================================
	// MUTATIONS - Throw exception if they fail
	// ========================================================================

	/**
	* Creates a new user\
	* Responsibility:\
	* - Generate ID and timestamp\
	* - Normalize data\
	* - Store
	*/
	async create(data: UserTypes.CreateUserBody): Promise<UserTypes.UserPublic> {
		const now = new Date().toISOString();
		const nowSeconds = Math.floor(Date.now() / 1000);

		const now_ts = Date.now();

		this.db.prepare(`
			INSERT INTO users (
				id, username, email, password_hash, auth_provider, oauth_id, avatar,
				is_online, is_deleted, last_logout_at, created_at, updated_at)
			VALUES (
				@id, @username, LOWER(@email), @password_hash, @auth_provider, @oauth_id, @avatar,
				0, 0, @last_logout_at, @created_at, @updated_at)
		`).run({
			id: data.id,
			username: Utils.UserNormalizer.usernameForStorage(data.username),
			email: Utils.UserNormalizer.email(data.email),
			password_hash: data.passwordHash ?? null,
			auth_provider: data.authProvider ?? 'local',
			oauth_id: data.oauthId ?? null,
			avatar: Utils.UserNormalizer.avatar(data.avatar) || UserEnv.CLOUDINARY_DEFAULT_AVATAR(),
			last_logout_at: nowSeconds,
			created_at: now_ts,
			updated_at: now_ts,
		});

		const created = await this.findUserById(data.id);

		if (!created)
			throw new SharedErrors.NotFoundError(`Could not retrieve user after create: ${data.id}`);

		return created;
	}

	/** Create OAuth user (no password) */
	async createOAuthUser(data: {
		id: string;
		username: string;
		email: string;
		authProvider: string;
		oauthId: string;
		avatar?: string;
	}): Promise<UserTypes.UserInternal> {
		const now_ts = Date.now();
		const nowSeconds = Math.floor(Date.now() / 1000);

		this.db.prepare(`
			INSERT INTO users (
				id, username, email, password_hash, auth_provider, oauth_id, avatar,
				is_online, is_deleted, last_logout_at, created_at, updated_at)
			VALUES (
				@id, @username, LOWER(@email), NULL, @auth_provider, @oauth_id, @avatar,
				0, 0, @last_logout_at, @created_at, @updated_at)
		`).run({
			id: data.id,
			username: Utils.UserNormalizer.usernameForStorage(data.username),
			email: Utils.UserNormalizer.email(data.email),
			auth_provider: data.authProvider,
			oauth_id: data.oauthId,
			avatar: data.avatar ?? UserEnv.CLOUDINARY_DEFAULT_AVATAR(),
			last_logout_at: nowSeconds,
			created_at: now_ts,
			updated_at: now_ts,
		});

		const created = await this.findUserByIdInternal(data.id);
		if (!created)
			throw new SharedErrors.NotFoundError(`Could not retrieve OAuth user after create: ${data.id}`);
		return created;
	}

	/** Link OAuth identity to existing user */
	async linkOAuthIdentity(userId: string, provider: string, oauthId: string): Promise<UserTypes.UserInternal> {
		const now_ts = Date.now();
		this.db.prepare(`
			UPDATE users SET auth_provider = ?, oauth_id = ?, updated_at = ? WHERE id = ?
		`).run(provider, oauthId, now_ts, userId);

		const updated = await this.findUserByIdInternal(userId);
		if (!updated)
			throw new SharedErrors.NotFoundError(`User not found after linking OAuth: ${userId}`);
		return updated;
	}

	/** Update user, throws NotFoundError if not found */
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
		
		// Validate that there are valid fields to update
		if (Object.values(updateData).filter(v => v !== undefined).length === 0)
			throw new SharedErrors.ValidationError('No valid fields to update', 'body');

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
			throw new SharedErrors.NotFoundError(`User ${id} not found`, 'user');
			
		const updated = await this.findUserById(id);
				
		if (!updated)
			throw new Error(`Could not retrieve user: ${id}`);
		
		return updated;
	}

	/** Updates the password (hash), throws NotFoundError if not found */
	async updatePassword(id: string, passwordHash: string): Promise<UserTypes.UserPublic> {
		const result = this.db.prepare(`
			UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?
		`).run(passwordHash, Date.now(), id);

		if (result.changes === 0)
			throw new SharedErrors.NotFoundError(`User not found: ${id}`, 'user');

		const updated = await this.findUserById(id);

		if (!updated)
			throw new SharedErrors.NotFoundError(`Could not retrieve user: ${id}`, 'user');

		return updated;
	}

	/** Deletes a user by their ID */
	async delete(id: string): Promise<void> {
		const result = this.db.prepare(`
			DELETE FROM users WHERE id = ?
		`).run(id);

		if (result.changes === 0)
			throw new SharedErrors.NotFoundError(`User not found: ${id}`, 'user');
	}

	/** Anonymizes the user by their ID, throws NotFoundError if not found */
	async anonymize(id: string): Promise<UserTypes.UserPublic> {
		const now = Date.now();
		const anonName = `anon_${now}`;

		this.db.prepare(`
			DELETE FROM friendships
			WHERE user_id = ? OR friend_id = ?
		`).run(id, id);

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
			throw new SharedErrors.NotFoundError(`Could not modify record: ${id}`, 'user');

		return {
			id: id,
			username: anonName,
			email: `${anonName}@deleted.email`,
			avatar: UserConstants.ANON_AVATAR,
			isOnline: false,
			has2FAEnabled: false,
			lastLogoutAt: Math.floor(now / 1000),
			createdAt: new Date(now).toISOString(),
			updatedAt: new Date(now).toISOString()
			};
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
			throw new SharedErrors.NotFoundError(`User ${id} had no changes`, 'user');

		const updated = await this.findUserById(id);

		if (!updated)
			throw new Error(`Could not retrieve user: ${id}`);

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
					'totpSecret and backupCodeHash are required when enabling 2FA',
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
				`Could not retrieve user: ${userId}` +
				`This should not happen. Possible race condition or corrupted DB.`
			);

		return updated;
	}

	/** Update lastLogoutAt to expire access tokens */
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
			throw new SharedErrors.NotFoundError(`User ${userId} had no changes`, 'user');
		}
	}

	// ========================================================================
	// QUERIES - Retornan null si no encuentran
	// ========================================================================

	/** Search by ID and return public user (without private fields) */
	async findUserById(id: string): Promise<UserTypes.UserPublic | null> {
		const row = this.db.prepare(`
			SELECT * FROM users WHERE id = ?
		`).get(id) as UserTypes.UserRow | undefined;

		return row ? UserMapper.rowToResponse(row) : null;
	}

	/** Search by ID and return internal user (with private fields) */
	async findUserByIdInternal(id: string): Promise<UserTypes.UserInternal | null> {
		const row = this.db.prepare(`
			SELECT * FROM users WHERE id = ?
		`).get(id) as UserTypes.UserRow | undefined;
			
		return row ? UserMapper.rowToInternal(row) : null;
	}

	/** Search by EMAIL and return public user (without private fields) */
	async findUserByEmail(email: string): Promise<UserTypes.UserInternal | null> {
		const normalizedEmail = Utils.UserNormalizer.email(email);
		
		const row = this.db.prepare(`
			SELECT * FROM users WHERE LOWER(email) = ?
		`).get(normalizedEmail) as UserTypes.UserRow | undefined;
							
		return row ? UserMapper.rowToInternal(row) : null;
	}

	/** Search by EMAIL and return internal user (with private fields) */
	async findUserByEmailInternal(email: string): Promise<UserTypes.UserInternal | null> {
		const normalizedEmail = Utils.UserNormalizer.email(email);
		const row = this.db.prepare(`
			SELECT * FROM users WHERE LOWER(email) = ?
		`).get(normalizedEmail) as UserTypes.UserRow | undefined;
		return row ? UserMapper.rowToInternal(row) : null;
	}

	/** Search by OAuth provider and ID, return internal user (with private fields) */
	async findByOAuth(provider: AuthTypes.AuthProvider, oauthId: string): Promise<UserTypes.UserInternal | null> {
		const row = this.db.prepare(`
			SELECT * FROM users WHERE auth_provider = ? AND oauth_id = ?
		`).get(provider, oauthId) as UserTypes.UserRow | undefined;
		return row ? UserMapper.rowToInternal(row) : null;
	}
	
	/** Search by USERNAME and return public user (without private fields) */
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
		`).get(userId) as { last_logout_at: number } | undefined;

		return result ? result.last_logout_at : null;
	}
	
	// ========================================================================
	// CHECKERS - Retornan siempre un valor
	// ========================================================================

	/** Check if a username is already in use */
	async isUsernameTaken(username: string): Promise<boolean> {
		const normalizedUsername = Utils.UserNormalizer.usernameForSearch(username);
								
		const isUsername = this.db.prepare(`
			SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(username) = ? AND is_deleted = '0') AS taken
		`).get(normalizedUsername) as { taken: number };
									
		return isUsername.taken ? true : false;
	}
					
	/** Check if an email is already registered */
	async isEmailTaken(email: string): Promise<boolean> {
		const normalizedEmail = Utils.UserNormalizer.email(email);
		
		const isEmail = this.db.prepare(`
			SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(email) = ? AND is_deleted = '0') AS taken
		`).get(normalizedEmail) as { taken: number };
	
		return isEmail.taken ? true : false;
	}
}