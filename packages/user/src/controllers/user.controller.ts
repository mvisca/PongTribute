import { FastifyRequest, FastifyReply } from 'fastify';
import { UserTypes, SharedErrors, AuthTypes, FRIENDSHIP_STATUS } from '@transcendence/shared';
import { UserService, FriendshipService } from '../index.js';

/** Controller de User - Orquesta llamadas al repository y maneja responses HTTP */
export class UserController {
	private userService: UserService;

	constructor(userService: UserService) {
		this.userService = userService;
	}

	// ========================================================================
	// CREATE USER
	// ========================================================================
	async createUser(request: FastifyRequest, reply: FastifyReply): Promise <void> {
		try {
			const data = request.body as UserTypes.CreateUserInput;
			const user = await this.userService.createUser(data);
			return reply.code(201).send(user);
		} catch (err) {
			return SharedErrors.handleError(err, reply);
		}
	}

	// ========================================================================
	// UPDATE USER
	// ========================================================================
	async update2FAStatus(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const { id } = request.params as UserTypes.UserIdParams;
			const data = request.body as UserTypes.Update2FAStatusBody;

			const user = await this.userService.update2FAStatus(
				id,
				data.has2FAEnabled,
				data.totpSecret,
				data.backupCodeHash
			);

			return reply.code(200).send(user);
			
		}catch(err) {
			return SharedErrors.handleError(err, reply);
		}
	}

	// ========================================================================
	// UPDATE USER
	// ========================================================================

	async updateUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const { id } = request.params as { id: string };
			const data = request.body as UserTypes.UpdateUserBody;

			const user = await this.userService.updateUser(id, data);
			return reply.code(200).send(user);
		} catch (err) {
			return SharedErrors.handleError(err, reply);
		}
	}

	// ========================================================================
	// UPDATE PASSWORD
	// ========================================================================

	async updatePassword(request: FastifyRequest, reply: FastifyReply): Promise <void> {
		try {
			const { id } = request.params as UserTypes.UserIdParams;

			const { passwordHash } = request.body as UserTypes.UpdatePasswordInternalBody;

			await this.userService.updatePassword(id, passwordHash);

			return reply.code(204).send();
		} catch (err) {
			return SharedErrors.handleError(err, reply);
		}
	}

	// ========================================================================
	// UPDATE LAST LOGOUT AT
	// ========================================================================

	async updateLastLogoutAt(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const { id } = request.params as UserTypes.UserIdParams;
			const data = request.body as AuthTypes.LastLogoutAt;

			await this.userService.updateLastLogoutAt(id, data.lastLogoutAt);
			return reply.code(204).send();
		} catch(err) {
			return SharedErrors.handleError(err, reply);
		}
	}

	// ========================================================================
	// SET ONLINE STATUS
	// ========================================================================

	async setOnlineStatus(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const { id } = request.params as { id: string };
			const { isOnline } = request.body as { isOnline: boolean };

			await this.userService.updateOnlineStatus(id, isOnline);
			return reply.code(204).send();
		} catch (err) {
			return SharedErrors.handleError(err, reply);
		}
	}

	// ========================================================================
	// ANONYMIZE
	// ========================================================================

	async anonymizeUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const { id } = request.params as UserTypes.UserIdParams;
			await this.userService.anonymizeUser(id);
			return reply.code(204).send();
		} catch (err) {
			return SharedErrors.handleError(err, reply);
		}
	}

	// ========================================================================
	// DELETE USER
	// ========================================================================

	async deleteUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const { id } = request.params as UserTypes.UserIdParams;
			await this.userService.deleteUser(id);			
			return reply.code(204).send();
		} catch (err) {
			return SharedErrors.handleError(err, reply);
		}
	}
	
	// ========================================================================
	// GETTERS
	// ========================================================================

	async findUserById(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const { id } = request.params as UserTypes.UserIdParams;
			const user = await this.userService.findUserById(id);
			return reply.code(200).send(user);
		} catch (err) {
			return SharedErrors.handleError(err, reply);
		}
	}
	
	async findUserByUsername(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const { username } = request.params as UserTypes.UsernameParams;
			const user = await this.userService.findUserByUsername(username);
			return reply.code(200).send(user);
		} catch (err) {
			return SharedErrors.handleError(err, reply);
		}
	}
	
	async findUserByEmail(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const { email } = request.params as UserTypes.EmailParams;
			const user = await this.userService.findUserByEmail(email);
			return reply.code(200).send(user);
		} catch (err) {
			return SharedErrors.handleError(err, reply);
		}
	}
	
	async getLastLogoutAt(request: FastifyRequest, reply: FastifyReply) {
		try {
			const { id } = request.params as UserTypes.UserIdParams;
			const lastLogoutAt = await this.userService.getLastLogoutAt(id);
			return reply.code(200).send({ lastLogoutAt });
		} catch (err) {
			return SharedErrors.handleError(err, reply);
		}
	}

	// ========================================================================
	// GETTERS INTERNALS
	// ========================================================================

	async findUserByEmailInternal(request: FastifyRequest, reply: FastifyReply): Promise <void> {
		try {
			const { email } = request.params as UserTypes.EmailParams;
			const user = await this.userService.findUserByEmailInternal(email);
			return reply.code(200).send(user);
		} catch (err) {
			return SharedErrors.handleError(err, reply);
		}
	}
	
	async findUserByIdInternal(request: FastifyRequest, reply: FastifyReply): Promise <void> {
		try {
			const { id } = request.params as UserTypes.UserIdParams;
			const user = await this.userService.findUserByIdInternal(id);
			return reply.code(200).send(user);
		} catch (err) {
			return SharedErrors.handleError(err, reply);
		}
	}

	async getFriendsInternal(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const { id } = request.params as UserTypes.UserIdParams;
			const friendshipService = new FriendshipService();
			const friendships = await friendshipService.listFriendships(id, { status: FRIENDSHIP_STATUS.ACCEPTED });
			const friendsIds = friendships.map(f => (f.userId === id ? f.friendId : f.userId));
			return reply.code(200).send({ friendsIds });
		} catch (err) {
			return SharedErrors.handleError(err, reply);
		}
	}

	// ========================================================================
	// VALIDADORES
	// ========================================================================

	async checkUsername(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const { username } = request.params as UserTypes.UsernameParams;
			const taken = await this.userService.checkUsername(username);			
			return reply.code(200).send({
				available: !taken,
				username
			});
		} catch (err) {
			return SharedErrors.handleError(err, reply);
		}
	}

	async checkEmail(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const { email } = request.params as UserTypes.EmailParams;
			const taken = await this.userService.checkEmail(email);
			return reply.code(200).send({
				available: !taken,
				email
			});
		} catch (err) {
			return SharedErrors.handleError(err, reply);
		}
	}
}