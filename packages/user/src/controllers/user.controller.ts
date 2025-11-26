import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from  'bcryptjs';
import { UserTypes } from '@transcendence/shared';
import { UserMapper, UserService } from '../index.js';

/** Controller de User - Orquesta llamadas al repository y maneja responses HTTP */
export class UserController {
	private userService: UserService;
	
	constructor() {
		this.userService = new UserService();
	}
	
	async createUser( 
		request: FastifyRequest,
		reply: FastifyReply
	): Promise <void> {
		try {
			const data = request.body as UserTypes.CreateUserInput;

			const isUsernameAvailable = await this.userService.checkUsernameAvailable(data.username);
			if (!isUsernameAvailable) {
				return reply
				.code(409)
				.send({
					error: 'Conflict',
					message: 'Username ya existe',
					field: 'username'
				});
			}

			const isEmailAvailable = await this.userService.checkEmailAvailable(data.email);
			if (isEmailAvailable) {
				return reply
				.code(409)
				.send({
					error: 'Conflict',
					message: 'Email ya existe',
					field: 'email'
				});
			}

			const { password, ...rest } = data;
			const dataHash: UserTypes.CreateUserBody = {
				...rest,
				passwordHash: bcrypt.hashSync(password, 10)
			}

			const newUser = await this.userRepo.create(dataHash);

			return reply
			.code(201)
			.header('Location', `/api/users/${newUser.id}`)
			.send(newUser);
			
		} catch (err) {
			request.log.error(err);
			throw err;
		}
	}
	
	/**
	* 
	* Método para actualizar un registro de la tabla users\
	* Verifica que el User existe\
	* Comprueba la unicidad de los datos username y email, condicional:\
	* 	- Si es del current user OK\
	* 	- Si es de otro user 409\
	* Actualiza\
	* \
	* @param request Params con { id: string } y Body tipo UserUpdate
	* @param reply 
	* @returns tipo UserPublic
	*/
	async updateUser(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> {
		try {

			// extraer el body y params
			const data = request.body as UserTypes.UpdateUserBody;
			const { id } = request.params as { id: string };

			// buscar user
			const user = await this.userRepo.findById(id);

			// si no existe terminar
			if (!user || user.isDeleted) {
				return reply
				.code(404)
				.send({
					error: 'Not found',
					message: 'El usuario no existe',
					field: 'id'
				});
			}

			// verificar si el email esta usado
			// si está usado por otro user, terminar
			if (data.email) {
				// es el email de otro usuario?
				const emailOwner = await this.userRepo.findByEmail(data.email);
				if (emailOwner && emailOwner.id !== id) {
					return reply
					.code(409)
					.send({
						error: 'Conflict',
						message: 'El email ya está en uso por otro usuario',
						field: 'email'
					});
				}
			}
			
			// verificar si el username está usado
			// si está usado por otro user, terminar
			if (data.username) {
				// es el de otro usuario?
				const usernameOwner = await this.userRepo.findByUsername(data.username);
				if (usernameOwner && usernameOwner.id !== id) {
					return reply
					.code(409)
					.send({
						error: 'Conflict',
						message: 'El username ya está en uso por otro usuario',
						field: 'username'
					});
				}
			} 
			
			// actualizar
			const updatedUser = await this.userRepo.update(id, data);
			
			// respuesta éxito
			return reply .code(200).send(updatedUser);
			
		} catch (err) {
			request.log.error(err);
			throw err;
		}
	}
	
	/**
	* Actualiza el password\
	* @param request Body con tipo UserPassworUpdate y Params tipo UserId\
	* @param reply \
	* @returns void
	*/
	async updatePassword(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise <void> {
		try {
			const { id } = request.params as { id: string };
			const data = request.body as UserTypes.UpdatePasswordInternalBody;
			
			const user = await this.userRepo.findById(id);

			if (!user || user.isDeleted) {
				return reply
				.code(404)
				.send({
					error: 'Not found',
					message: 'El user no existe',
					field: 'id'
				});
			}
			
			await this.userRepo.updatePassword(id, data.newPasswordHash);
			
			return reply.code(204).send();
			
		} catch (err) {
			request.log.error(err);
			throw err;
		}
	}

	/**
	* Borra el user si existe\
	* @param request Param tipo{ id: string }\
	* @param reply \
	* @returns void
	*/
	
	async anonymizeUser(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> {
		try {
			const { id } = request.params as { id: string };

			const user = await this.userRepo.findById(id);

			if (!user || user.isDeleted) {
				return reply
				.code(404)
				.send({
					error: 'Not found',
					message: 'El user no existe',
					field: 'id'
				});
			}

			await this.userRepo.anonymize(id);

			return reply.code(204).send();

		} catch (err) {
			request.log.error(err);
			throw err;
		}
	}

	/**
	* Borra el user si existe\
	* @param request Param tipo{ id: string }\
	* @param reply \
	* @returns void
	*/
	async deleteUser(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> {
		try {
			const { id } = request.params as { id: string };
			
			const user = await this.userRepo.findById(id);
			
			if (!user) {
				return reply
				.code(404)
				.send({
					error: 'Not found',
					message: 'El user no existe',
					field: 'id'
				});
			}
			
			await this.userRepo.delete(id);
			
			return reply.code(204).send();
			
		} catch (err) {
			request.log.error(err);
			throw err;
		}
	}
	
	/**
	* Busca user por id\
	* @param request Param de tipo { id: string }\
	* @param reply \
	* @returns user de tipo UserPublic
	*/
	async getUserById(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> {
		try {
			const { id } = request.params as{ id: string };
			
			const user = await this.userRepo.findById(id);
			
			if (!user || user.isDeleted === true) {
				return reply
				.code(404)
				.send({
					error: 'Not found',
					message: 'El user no existe',
					field: 'id'
				});
			}
			
			return reply.code(200).send(user);
			
		} catch (err) {
			request.log.error(err);
			throw err;
		}
	}
	
	/**
	* Busca user por username\
	* @param request Params de tipo { username: string }\
	* @param reply \
	* @returns user de tipo UserPublic
	*/
	async getUserByUsername(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> {
		try {
			
			const { username } = request.params as { username: string };
			
			const user = await this.userRepo.findByUsername(username);
			
			if (!user || user.isDeleted === true) {
				return reply
				.code(404)
				.send({
					error: 'Not found',
					message: 'El user no existe',
					field: 'username'
				});
			}
			
			return reply.code(200).send(user);
			
		} catch (err) {
			request.log.error(err);
			throw err;
		}
	}
	
	/**
	* Busca user por email\
	* @param request Param de tipo { email: string }\
	* @param reply \
	* @returns user de tipo User (este incluye el hashPassword porque se usa para Auth)
	*/
	async getUserByEmail(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> {
		try {
			
			const { email } = request.params as { email: string };
			
			const user = await this.userRepo.findByEmail(email);
			
			if (!user || user.isDeleted === true) {
				return reply
				.code(404)
				.send({
					error: 'Not found',
					message: 'El user no existe',
					field: 'email'
				});
			}
			
			const publicUser = UserMapper.internalToResponse(user);

			return reply.code(200).send(user);
			
		} catch (err) {
			request.log.error(err);
			throw err;
		}
	}

	/**
	* Checkea que el username esté usado\
	* @param request Params tipo { username: string }\
	* @param reply \
	* @returns { available: true | false, username: string }
	*/
	async checkUsername(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> {
		try {
			
			const { username } = request.params as { username: string };
			
			const taken = await this.userRepo.isUsernameTaken(username);
			
			return reply.code(200).send({
				available: !taken,
				username
			});
			
		} catch (err) {
			request.log.error(err);
			throw err;
		}
	}
	
	/**
	* Checkea que el email esté usado\
	* @param request Params tipo { username: string }\
	* @param reply \
	* @returns { available: true | false, email: string }
	*/
	async checkEmail(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<void> {
		try {
			
			const { email } = request.params as { email: string };
			
			const taken = await this.userRepo.isEmailTaken(email);
			
			return reply.code(200).send({
				available: !taken,
				email
			});
			
		} catch (err) {
			request.log.error(err);
			throw err;
		}
	}

	async getInternalUserByEmail(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise <void> {
		const { email } =   request.params as { email: string };

		const user = await this.userRepo.findByEmail(email);

		if (!user){
			return reply.code(404).send({
				error: 'Not found',
				message: 'User not found'
			})
		}

		return reply.code(200).send(user);
	}

	async getInternalUserById(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise <void> {
		const { id } =   request.params as { id: string };

		const user = await this.userRepo.findByIdInternal(id);

		if (!user){
			return reply.code(404).send({
				error: 'Not found',
				message: 'User not found'
			})
		}

		return reply.code(200).send(user);
	}
}