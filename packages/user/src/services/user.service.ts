import bcrypt from  'bcryptjs';
import { UserTypes, Utils } from '@transcendence/shared';
import { IUserRepository, SQLiteUserRepository, UserEnv, UserMapper } from '../index.js';
import { ConflictError, NotFoundError, ValidationError } from '../index.js';

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
			throw new ConflictError('El email ya está en uso', 'email');

		if (usernameTaken)
			throw new ConflictError('El username ya está en uso', 'username');

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
		
		const user = await this.userRepo.create(fullData);
		if (!user) {
			throw new Error('Error al crear usuario en la base de datos');
		}

		return user;
	}

	async updateUser(id: string, data: UserTypes.UpdateUserBody): Promise<UserTypes.UserPublic> {

		const user = await this.userRepo.findById(id);
		if (!user || user.isDeleted) {
			throw new NotFoundError('El usuario no existe', 'user');
		}
		
		if (data.email && data.email !== user.email) {
			const isEmailTaken = await this.userRepo.isEmailTaken(data.email);
			if (isEmailTaken)
				throw new ConflictError('El email ya está en uso', 'email');
		}

		if (data.username && data.username !== user.username) {
			const isUsernameTaken = await this.userRepo.isUsernameTaken(data.username);
			if (isUsernameTaken)
				throw new ConflictError('El username ya está en uso', 'username');
		}

		const updated = await this.userRepo.update(id, data);

		if (!updated) {
			throw new ValidationError('No hay campos válidos para actualizar');
		}

		return updated;
	}
	
	async updatePassword(id: string, newPasswordHash: string): Promise<void> {
		const user = await this.userRepo.findById(id);
		if (!user || user.isDeleted)
			throw new NotFoundError('El usuario no existe', 'user');
		
		await this.userRepo.updatePassword(id, newPasswordHash);
	}

	async anonymizeUser(id: string): Promise<void> {
		const user = await this.userRepo.findById(id);
		if (!user || user.isDeleted)
			throw new NotFoundError('El usuario no existe', 'user');
		await this.userRepo.anonymize(id);
	}

	async deleteUser(id: string): Promise<void> {
		const user = await this.userRepo.findById(id);
		if (!user || user.isDeleted)
			throw new NotFoundError('El usuario no existe', 'user');
		await this.userRepo.delete(id);
	}

	async getUserById(id: string): Promise<UserTypes.UserPublic> {
		const user = await this.userRepo.findById(id);
		if (!user || user.isDeleted)
			throw new NotFoundError('User not found', 'user');
		return user;
	}
	
	async getUserByUsername(username: string): Promise<UserTypes.UserPublic> {
		const user = await this.userRepo.findByUsername(username);
		if (!user || user.isDeleted)
			throw new NotFoundError('User not found', 'user');
		return user;
	}

	async getUserByEmail(email: string): Promise<UserTypes.UserPublic> {
		const user = await this.userRepo.findByEmail(email);
		if (!user || user.isDeleted)
			throw new NotFoundError('User not found', 'user');

		const publicUser = UserMapper.internalToResponse(user);
		return publicUser;
	}

	async checkUsername(username: string): Promise<boolean> {
		return await this.userRepo.isUsernameTaken(username);
	}

	async checkEmail(email: string): Promise<boolean> {
		return await this.userRepo.isEmailTaken(email);
	}

	async getInternalUserByEmail(email: string): Promise<UserTypes.UserInternal> {
		const user = await this.userRepo.findByEmail(email);
		if (!user || user.isDeleted)
			throw new NotFoundError('User not found', 'user');
		return user;
	}

	async getInternalUserById(id: string): Promise<UserTypes.UserInternal> {
		const user = await this.userRepo.findByIdInternal(id);
		if (!user || user.isDeleted)
			throw new NotFoundError('User not found', 'user');
		return user;
	}
}