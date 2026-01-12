import bcrypt from 'bcryptjs';
import { UserTypes, Utils, SharedErrors } from '@transcendence/shared';
import { IUserRepository, SQLiteUserRepository, UserEnv, UserMapper } from '../index.js';

export class UserService {
	private userRepo: IUserRepository;

	constructor() {
		this.userRepo = new SQLiteUserRepository();
	}

	/** Validación de argumento avatar en updateUser */
	private validateAvatar(avatar?: string): boolean {
		if (!avatar || avatar.trim() === "") return false;

		// Validar base64
		const base64Regex = /^data:image\/(png|jpg|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
		if (!base64Regex.test(avatar)) return false;

		// Validar tamaño
		const base64Data = avatar.split(',')[1];
		if (!base64Data) return false;

		const sizeInBytes = (base64Data.length * 3) / 4; // Aproximación base64
		const maxSizeBytes = 10 * 1024 * 1024; // 10MB

		return sizeInBytes <= maxSizeBytes;
	}

	/** Upload de imagen llamando a Image Service */
	private async uploadAvatarToCloudinary(
		base64Image: string,
		oldAvatarUrl?: string
	): Promise<string> {
		try {
			const response = await fetch(
				`${UserEnv.IMAGE_SERVICE_URL}/internal/upload`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-Service-Secret': UserEnv.SERVICE_SECRET
					},
					body: JSON.stringify({
						base64: base64Image,
						...( oldAvatarUrl && { old_avatar: oldAvatarUrl })
					})
				}
			);

			if (!response.ok) {
				const error = await response.json() as { message: string }; // TODO tipar adecuadamente
				throw new Error(`Image service error: ${error?.message || response.statusText}`);
			}

			const data = await response.json() as { url: string };
			return data.url;
		} catch (err) {
			console.error('Fallo subiendo avatar: ', err);
			// Mantener avatar actual si falla (diferente de Auth Service)
			return oldAvatarUrl || UserEnv.CLOUDINARY_DEFAULT_AVATAR;
		}
	}

	async createUser(data: UserTypes.CreateUserInput): Promise<UserTypes.UserPublic> {

		const [emailTaken, usernameTaken] = await Promise.all([
			this.userRepo.isEmailTaken(data.email),
			this.userRepo.isUsernameTaken(data.username)
		]);

		if (emailTaken)
			throw new SharedErrors.ConflictError('El email ya está en uso', 'email');

		if (usernameTaken)
			throw new SharedErrors.ConflictError('El username ya está en uso', 'username');

		const { password, ...rest } = data;
		const passwordHash = await bcrypt.hash(password, UserEnv.BCRYPT_ROUNDS);

		const userId = Utils.generateUserId();
		const fullData = {
			id: userId,
			passwordHash,
			isOnline: true,
			isDeleted: false,
			has2FAEnabled: false,
			...rest
		};

		return await this.userRepo.create(fullData);
	}

	async updateUser(id: string, data: UserTypes.UpdateUserBody): Promise<UserTypes.UserPublic> {

		const user = await this.userRepo.findUserByIdInternal(id);
		if (!user || user.isDeleted)
			throw new SharedErrors.NotFoundError('El usuario no existe', 'user');

		// Si hay avatar nuevo en formato base64, procesarlo
		if (data.avatar && data.avatar.startsWith('data:image/')) {
			if (this.validateAvatar(data.avatar)) {
				// Subir nuevo avatar (uploadAvatarToCloudinary maneja el fallback)
				data.avatar = await this.uploadAvatarToCloudinary(
					data.avatar,
					user.avatar  // Se pasa para eliminación si upload exitoso
				);
			} else {
				// Avatar inválido - mantener el actual
				delete data.avatar;
			}
		}

		if (data.email && data.email !== user.email) {
			const isEmailTaken = await this.userRepo.isEmailTaken(data.email);
			if (isEmailTaken)
				throw new SharedErrors.ConflictError('El email ya está en uso', 'email');
		}

		if (data.username && data.username !== user.username) {
			const isUsernameTaken = await this.userRepo.isUsernameTaken(data.username);
			if (isUsernameTaken)
				throw new SharedErrors.ConflictError('El username ya está en uso', 'username');
		}

		return await this.userRepo.update(id, data);
	}

	async update2FAStatus( // TODO actualizar llamado en user.controller
		userId: string,
		has2FAEnabled: boolean,
		totpSecret?: string,
		backupCodeHash?: string
	): Promise<UserTypes.UserPublic> {
		return await this.userRepo.update2FAStatus(
			userId,
			has2FAEnabled,
			totpSecret,
			backupCodeHash
		);
	}

	async updatePassword(id: string, newPasswordHash: string): Promise<UserTypes.UserPublic> {
		return await this.userRepo.updatePassword(id, newPasswordHash);
	}

	async updateOnlineStatus(id: string, isOnline: boolean): Promise<UserTypes.UserPublic> {
		return await this.userRepo.setOnlineStatus(id, isOnline);
	}

	async anonymizeUser(id: string): Promise<void> {
		await this.userRepo.anonymize(id);
	}

	async deleteUser(id: string): Promise<void> {
		await this.userRepo.delete(id);
	}

	async findUserById(id: string): Promise<UserTypes.UserPublic> {
		const user = await this.userRepo.findUserByIdInternal(id);
		if (!user || user.isDeleted)
			throw new SharedErrors.NotFoundError('User not found', 'user');
		return UserMapper.internalToResponse(user);
	}

	async findUserByUsername(username: string): Promise<UserTypes.UserPublic> {
		const user = await this.userRepo.findUserByUsername(username);
		if (!user)
			throw new SharedErrors.NotFoundError('User not found', 'user');
		const userComplete = await this.userRepo.findUserByIdInternal(user.id);
		if (!userComplete || userComplete.isDeleted)
			throw new SharedErrors.NotFoundError('User not found', 'user');
		return user;
	}

	async findUserByEmail(email: string): Promise<UserTypes.UserPublic> {
		const user = await this.userRepo.findUserByEmailInternal(email);
		if (!user || user.isDeleted)
			throw new SharedErrors.NotFoundError('User not found', 'user');

		const publicUser = UserMapper.internalToResponse(user);
		return publicUser;
	}

	async checkUsername(username: string): Promise<boolean> {
		return await this.userRepo.isUsernameTaken(username);
	}

	async checkEmail(email: string): Promise<boolean> {
		return await this.userRepo.isEmailTaken(email);
	}

	async findUserByEmailInternal(email: string): Promise<UserTypes.UserInternal> {
		const user = await this.userRepo.findUserByEmailInternal(email);
		if (!user || user.isDeleted)
			throw new SharedErrors.NotFoundError('User not found', 'user');
		return user;
	}

	async findUserByIdInternal(id: string): Promise<UserTypes.UserInternal> {
		const user = await this.userRepo.findUserByIdInternal(id);
		if (!user || user.isDeleted)
			throw new SharedErrors.NotFoundError('User not found', 'user');
		return user;
	}
}