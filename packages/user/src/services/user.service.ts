import bcrypt from 'bcryptjs';
import type { Redis } from 'ioredis';
import {
	UserTypes,
	Utils,
	SharedErrors,
	REDIS_CHANNEL,
	TRANSCENDENCE_EVENTS
} from '@transcendence/shared';
import {
	IUserRepository,
	SQLiteUserRepository,
	UserEnv,
	UserMapper
} from '../index.js';

export class UserService {
	private userRepo: IUserRepository;
	private redisClient: Redis;

	constructor(redisClient: Redis) {
		this.userRepo = new SQLiteUserRepository();
		this.redisClient = redisClient;
	}

	/** Validación de argumento avatar en updateUser */
	private validateAvatar(avatar?: string): boolean {
		if (!avatar || avatar.trim() === "") return false;

		// Validar formato y extraer base64
		const base64Regex = /^data:image\/(png|jpg|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/;
		const match = avatar.match(base64Regex);
		if (!match) return false;
		
		const [, mimeType, base64Data] = match;
		
		// Validar que base64 sea válido
		try {
			Buffer.from(base64Data, 'base64');
		} catch (e) {
			return false;  // Base64 inválido
		}

		// Validar tamaño (exacto, no aproximado)
		const sizeInBytes = Buffer.from(base64Data, 'base64').length;
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
				`${UserEnv.IMAGE_SERVICE_URL()}/internal/upload`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-Service-Secret': UserEnv.SERVICE_SECRET()
					},
					body: JSON.stringify({
						base64: base64Image,
						...( oldAvatarUrl && { old_avatar: oldAvatarUrl })
					}),
					signal: AbortSignal.timeout(5000)
				}
			);

			if (!response.ok) {
				const error = await response.json().catch(() => ({ message: 'Unknown error' })) as any;
				const errorMessage = error?.message || error?.error || response.statusText;
				throw new SharedErrors.ServiceError('image', `Fallo subiendo avatar a Cloudinary`, {
					endpoint: `${UserEnv.IMAGE_SERVICE_URL()}/internal/upload`,
					method: 'POST',
					status: response.status,
					statusText: response.statusText,
					errorMessage
				});
			}

			const data = await response.json() as { url: string };
			
			// Validar que URL sea válida
			if (!data.url || typeof data.url !== 'string') {
				throw new SharedErrors.ValidationError(
					'Image Service retornó URL inválida',
					'url',
					{ 
						received: typeof data.url, 
						expected: 'string',
						operation: 'uploadAvatarToCloudinary'
					}
				);
			}
			
			// Validar que sea URL válida
			try {
				new URL(data.url);
			} catch (e) {
				throw new SharedErrors.ValidationError(
					'Image Service retornó URL con formato inválido',
					'url',
					{ 
						receivedUrl: data.url, 
						operation: 'uploadAvatarToCloudinary',
						error: (e as Error).message
					}
				);
			}

			// Validar que sea de Cloudinary
			if (!data.url.startsWith('https://res.cloudinary.com/')) {
				throw new SharedErrors.ValidationError(
					'Image Service retornó URL no de Cloudinary',
					'url',
					{ 
						receivedUrl: data.url, 
						operation: 'uploadAvatarToCloudinary',
						expectedDomain: 'https://res.cloudinary.com/'
					}
				);
			}

			return data.url;
		} catch (err) {
			if (err instanceof SharedErrors.ValidationError || err instanceof SharedErrors.ServiceError || err instanceof SharedErrors.ConflictError || err instanceof SharedErrors.NotFoundError) {
				throw err;
			}
			console.error('Fallo subiendo avatar: ', err);
			// Mantener avatar actual si falla (diferente de Auth Service)
			return oldAvatarUrl || UserEnv.CLOUDINARY_DEFAULT_AVATAR();
		}
	}

	async createUser(data: UserTypes.CreateUserInput): Promise<UserTypes.UserPublic> {

		const [emailTaken, usernameTaken] = await Promise.all([
			this.userRepo.isEmailTaken(data.email),
			this.userRepo.isUsernameTaken(data.username)
		]);

		if (emailTaken) {
			throw new SharedErrors.ConflictError('El email ya está en uso', 'email', {
				operation: 'createUser',
				attemptedEmail: data.email
			});
		}

		if (usernameTaken) {
			throw new SharedErrors.ConflictError('El username ya está en uso', 'username', {
				operation: 'createUser',
				attemptedUsername: data.username
			});
		}

		const { password, ...rest } = data;
		const passwordHash = await bcrypt.hash(password, UserEnv.BCRYPT_ROUNDS());
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
			throw new SharedErrors.NotFoundError('El usuario no existe', 'user', {
				userId: id,
				operation: 'updateUser',
				isDeleted: user?.isDeleted
			});

		const oldUsername = user.username;

		if (data.avatar !== undefined) {
			
			if (data.avatar === '') {
				// Si es string vacío, borrar
				delete data.avatar;
			
			} else if (data.avatar.startsWith('data:image/')) {
				// Es base64, validar formato
				if (this.validateAvatar(data.avatar)) {
					// Base64 válido, subir a Cloudinary
					data.avatar = await this.uploadAvatarToCloudinary(data.avatar, user.avatar);
				} else {
					// Inválido, borrar
					delete data.avatar;
				}
			} else {
				// Es undefined, borrar
				delete data.avatar;
			}
		}

		if (data.email && data.email !== user.email) {
			const isEmailTaken = await this.userRepo.isEmailTaken(data.email);
			if (isEmailTaken)
				throw new SharedErrors.ConflictError('El email ya está en uso', 'email', {
					operation: 'updateUser',
					userId: id,
					attemptedEmail: data.email
				});
		}

		if (data.username && data.username.toLowerCase() !== user.username.toLowerCase()) {
			const isUsernameTaken = await this.userRepo.isUsernameTaken(data.username);
			if (isUsernameTaken)
				throw new SharedErrors.ConflictError('El username ya está en uso', 'username', {
					operation: 'updateUser',
					userId: id,
					attemptedUsername: data.username
				});
		}

		const updatedUser = await this.userRepo.update(id, data);

		if (updatedUser.username !== oldUsername) {
            console.log(`📣 [UserService] Username changed: ${oldUsername} -> ${updatedUser.username}`);

            const eventPayload = {
                type: TRANSCENDENCE_EVENTS.USER_PROFILE_UPDATED,
                payload: {
                    userId: id,
                    username: updatedUser.username
                }
            };

            // Publicar al canal de eventos
            this.redisClient.publish(REDIS_CHANNEL, JSON.stringify(eventPayload))
                .catch(err => console.error('❌ Error publicando evento Redis:', err));
        }
        return updatedUser;
	}

	async update2FAStatus(
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

	async updatePassword(id: string, passwordHash: string): Promise<UserTypes.UserPublic> {
		return await this.userRepo.updatePassword(id, passwordHash);
	}

	async updateLastLogoutAt(id: string, lastLogoutAt: number): Promise<void> {
		await this.userRepo.updateLastLogoutAt(id, lastLogoutAt);
	}

	async updateOnlineStatus(id: string, isOnline: boolean): Promise<UserTypes.UserPublic> {
		return await this.userRepo.setOnlineStatus(id, isOnline);
	}

	async anonymizeUser(id: string): Promise<void> {
		// En esta llamada, el repo se encarga de limpiar también amistades
		// DEUDA se debe manejar un llamado al FriendshipRepo para que haga la limpieza
		// Así se mantiene la lógica en el service y cada repo maneja sus tablas ;P
		await this.userRepo.anonymize(id);
	}

	async deleteUser(id: string): Promise<void> {
		await this.userRepo.delete(id);
	}

	async findUserById(id: string): Promise<UserTypes.UserPublic> {
		const user = await this.userRepo.findUserByIdInternal(id);
		if (!user || user.isDeleted)
			throw new SharedErrors.NotFoundError('User not found', 'user', {
				userId: id,
				operation: 'findUserById',
				notFound: !user,
				isDeleted: user?.isDeleted
			});
		return UserMapper.internalToResponse(user);
	}

	async findUserByUsername(username: string): Promise<UserTypes.UserPublic> {
		const user = await this.userRepo.findUserByUsername(username);
		if (!user)
			throw new SharedErrors.NotFoundError('User not found', 'user', {
				attemptedUsername: username,
				operation: 'findUserByUsername'
			});
		const userComplete = await this.userRepo.findUserByIdInternal(user.id);
		if (!userComplete || userComplete.isDeleted)
			throw new SharedErrors.NotFoundError('User not found', 'user', {
				userId: user.id,
				operation: 'findUserByUsername',
				isDeleted: userComplete?.isDeleted
			});
		return user;
	}

	async findUserByEmail(email: string): Promise<UserTypes.UserPublic> {
		const user = await this.userRepo.findUserByEmailInternal(email);
		if (!user || user.isDeleted)
			throw new SharedErrors.NotFoundError('User not found', 'user', {
				attemptedEmail: email,
				operation: 'findUserByEmail',
				isDeleted: user?.isDeleted
			});

		const publicUser = UserMapper.internalToResponse(user);
		return publicUser;
	}

	async getLastLogoutAt(userId: string): Promise<number> {
		const response = await this.userRepo.getLastLogoutAt(userId);
		if (response === null)
			throw new SharedErrors.NotFoundError('User not found', 'user', {
				userId,
				operation: 'getLastLogoutAt'
			});

		return response;
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
			throw new SharedErrors.NotFoundError('User not found', 'user', {
				attemptedEmail: email,
				operation: 'findUserByEmailInternal',
				isDeleted: user?.isDeleted
			});
		return user;
	}

	async findUserByIdInternal(id: string): Promise<UserTypes.UserInternal> {
		const user = await this.userRepo.findUserByIdInternal(id);
		if (!user || user.isDeleted)
			throw new SharedErrors.NotFoundError('User not found', 'user', {
				userId: id,
				operation: 'findUserByIdInternal',
				isDeleted: user?.isDeleted
			});
		return user;
	}
}