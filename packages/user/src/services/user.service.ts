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


}