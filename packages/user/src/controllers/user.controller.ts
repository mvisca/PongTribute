import { FastifyRequest, FastifyReply } from 'fastify';
import { UserTypes } from '@transcendence/shared';
import { UserService } from '../index.js';
import { ConflictError, NotFoundError, ValidationError } from '../index.js';

/** Controller de User - Orquesta llamadas al repository y maneja responses HTTP */
export class UserController {
	private userService: UserService;
	
	constructor() {
		this.userService = new UserService();
	}
	
	private errorHandler(err: unknown, request: FastifyRequest, reply: FastifyReply): void {
		if (err instanceof NotFoundError) {
			reply.code(404).send({error: 'Not Found', message: err.message, resource:err.resource});
			return;
		}
		
		if (err instanceof ConflictError) {
			reply.code(409).send({error: 'Conflict', message: err.message, field: err.field});
			return;
		}
		
		if (err instanceof ValidationError) {
			reply.code(403).send({error: 'Forbidden', message: err.message, field: err.field});
			return;
		}
		
		request.log.error(err);
		const message = err instanceof Error ? err.message : 'Unknown Error';
		reply.code(500).send({error: 'Internal Server Error', message});
	}
	
	async createUser(request: FastifyRequest, reply: FastifyReply): Promise <void> {
		try {
			const data = request.body as UserTypes.CreateUserInput;
			const user = await this.userService.createUser(data);
			return reply.code(201).send(user);
		} catch (err) {
			return this.errorHandler(err, request, reply);
		}
	}
	
	async updateUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const { id } = request.params as { id: string };
			const data = request.body as UserTypes.UpdateUserBody;
			const user = await this.userService.updateUser(id, data);
			return reply .code(200).send(user);
		} catch (err) {
			return this.errorHandler(err, request, reply);
		}
	}
	
	async updatePassword(request: FastifyRequest, reply: FastifyReply): Promise <void> {
		try {
			const { id } = request.params as { id: string };
			const data = request.body as UserTypes.UpdatePasswordInternalBody;
			await this.userService.updatePassword(id, data.newPasswordHash);
			return reply.code(204).send();
		} catch (err) {
			return this.errorHandler(err, request, reply);
		}
	}
	
	async anonymizeUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const { id } = request.params as { id: string };
			await this.userService.anonymizeUser(id);
			return reply.code(204).send();
		} catch (err) {
			return this.errorHandler(err, request, reply);
		}
	}
	
	async deleteUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const { id } = request.params as { id: string };
			await this.userService.deleteUser(id);			
			return reply.code(204).send();
		} catch (err) {
			return this.errorHandler(err, request, reply);
		}
	}
	
	async getUserById(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const { id } = request.params as { id: string };
			const user = await this.userService.getUserById(id);
			return reply.code(200).send(user);
		} catch (err) {
			return this.errorHandler(err, request, reply);
		}
	}
	
	async getUserByUsername(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const { username } = request.params as { username: string };
			const user = await this.userService.getUserByUsername(username);
			return reply.code(200).send(user);
		} catch (err) {
			return this.errorHandler(err, request, reply);
		}
	}
	
	async getUserByEmail(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const { email } = request.params as { email: string };
			const user = await this.userService.getUserByEmail(email);
			return reply.code(200).send(user);
		} catch (err) {
			return this.errorHandler(err, request, reply);
		}
	}
	
	async checkUsername(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const { username } = request.params as { username: string };
			const taken = await this.userService.checkUsername(username);			
			return reply.code(200).send({
				available: !taken,
				username
			});
		} catch (err) {
			return this.errorHandler(err, request, reply);
		}
	}
	
	async checkEmail(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const { email } = request.params as { email: string };
			const taken = await this.userService.checkEmail(email);
			return reply.code(200).send({
				available: !taken,
				email
			});
		} catch (err) {
			return this.errorHandler(err, request, reply);
		}
	}
	
	async getInternalUserByEmail(request: FastifyRequest, reply: FastifyReply): Promise <void> {
		try {
			const { email } = request.params as { email: string };
			const user = await this.userService.getInternalUserByEmail(email);
			return reply.code(200).send(user);
		} catch (err) {
			return this.errorHandler(err, request, reply);
		}
	}
	
	async getInternalUserById(request: FastifyRequest, reply: FastifyReply): Promise <void> {
		try {
			const { id } = request.params as { id: string };
			const user = await this.userService.getInternalUserById(id);
			return reply.code(200).send(user);
		} catch (err) {
			return this.errorHandler(err, request, reply);
		}
	}
}