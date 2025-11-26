import { IUserRepository, SQLiteUserRepository } from '../index.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from  'bcryptjs';
import { UserTypes } from '@transcendence/shared';
import { UserMapper } from '../index.js';

export class UserService {
	private userRepo: IUserRepository;
	
	constructor() {
		this.userRepo = new SQLiteUserRepository();
	}
	
	async checkUsernameAvailable(username: string): Promise<boolean> {
		return await this.userRepo.isUsernameTaken(username);
	}

	async checkEmailAvailable(email: string): Promise<boolean> {
		return await this.userRepo.isUsernameTaken(email);
	}

	async createUser(data: UserTypes.CreateUserBody) {

			const [emailTaken, usernameTaken] = await Promise.all([
				this.userRepo.isEmailTaken(data.email),
				this.userRepo.isUsernameTaken(data.username)
			]);


		/*
		Validaciones de negocio (duplicados)
		Bcrypt operations
		Generación de IDs
		Coordinación de múltiples operaciones repository
		*/
	}
}