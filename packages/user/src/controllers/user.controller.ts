import { FastifyRequest, FastifyReply } from 'fastify';
import { SQLiteUserRepository } from '../repositories/SQLiteUserRepository';
import { getDatabase } from '../connection';
import { UserTypes } from '@transcendence/shared';

/**
* Controller de User\
* Orquesta llamadas al repository y maneja responses HTTP
*/
export class UserController {
	private userRepo: SQLiteUserRepository;
	
	constructor() {
		const db = getDatabase();
		this.userRepo = new SQLiteUserRepository(db);
	}
	
	/**
	* Método llamado en la ruta\
	* Extrae dataya validada\
	* Comprueba unicidad\
	* Crea user\
	* \
	* @param request Body tipo CreateUserData\
	* @param reply\
	* @returns tipo UserPublic
	*/
	async createUser(
		request: FastifyRequest<{Body: UserTypes.CreateUserBody }>,
		reply: FastifyReply
	): Promise <void> {
		try {
			const data = request.body;

			const [emailTaken, usernameTaken] = await Promise.all([
				this.userRepo.isEmailTaken(request.body.email),
				this.userRepo.isUsernameTaken(data.username)
			]);
			
			// email usado
			if (emailTaken) {
				return reply
				.code(409)
				.send({
					error: 'Conflict',
					message: 'Email ya existe',
					field: 'email'
				});
			}

			if (usernameTaken) {
				return reply
				.code(409)
				.send({
					error: 'Conflict',
					message: 'Username ya existe',
					field: 'username'
				});
			}

			const newUser = await this.userRepo.create(data);

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
		request: FastifyRequest<{Params: { id: string }, Body: UserTypes.UpdateUserBody}>,
		reply: FastifyReply
	): Promise<void> {
		try {
			
			// extraer el body y params
			const data = request.body;
			const { id } = request.params;
			
			// buscar user
			const user = await this.userRepo.findById(id);
			
			// si no existe terminar
			if (!user) {
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
		request: FastifyRequest<{Params: { id: string }, Body: UserTypes.UpdatePasswordBody }>,
		reply: FastifyReply
	): Promise <void> {
		try {
			const { id } = request.params;
			const data = request.body;
			
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
	async deleteUser(
		request: FastifyRequest<{Params: { id: string } }>,
		reply: FastifyReply
	): Promise<void> {
		try {
			const { id } = request.params;
			
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
		request: FastifyRequest<{Params: { id: string }}>,
		reply: FastifyReply
	): Promise<void> {
		try {
			const { id } = request.params;
			
			const user = await this.userRepo.findById(id);
			
			if (!user){
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
		request: FastifyRequest<{Params: { username: string }}>,
		reply: FastifyReply
	): Promise<void> {
		try {
			
			const { username } = request.params;
			
			const user = await this.userRepo.findByUsername(username);
			
			if (!user) {
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
		request: FastifyRequest<{Params: { email: string }}>,
		reply: FastifyReply
	): Promise<void> {
		try {
			
			const { email } = request.params;
			
			const user = await this.userRepo.findByEmail(email);
			
			if (!user) {
				return reply
				.code(404)
				.send({
					error: 'Not found',
					message: 'El user no existe',
					field: 'email'
				});
			}
			
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
		request: FastifyRequest<{Params: { username: string }}>,
		reply: FastifyReply
	): Promise<void> {
		try {
			
			const { username } = request.params;
			
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
		request: FastifyRequest<{Params: { email: string }}>,
		reply: FastifyReply
	): Promise<void> {
		try {
			
			const { email } = request.params;
			
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
}
