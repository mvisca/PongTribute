import bcrypt from 'bcryptjs';
import { UserTypes, Utils, SharedErrors } from '@transcendence/shared';
import { IUserRepository, SQLiteUserRepository, UserEnv, UserMapper } from '../index.js';

export class UserService {
	private userRepo: IUserRepository;

	constructor() {
		this.userRepo = new SQLiteUserRepository();
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

	async update2FAStatus(
		userId: string,
		totpSecret: string | null,
		backupCodeHash: string | null,
		has2FAEnabled: boolean
	): Promise<UserTypes.UserPublic> {
		return await this.userRepo.update2FAStatus(userId, totpSecret, backupCodeHash, has2FAEnabled);
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