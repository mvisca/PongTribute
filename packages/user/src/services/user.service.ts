import bcrypt from 'bcryptjs';
import type { Redis } from 'ioredis';
import { createLogger, type AppLogger } from '@transcendence/shared';
import {
	UserTypes,
	Utils,
	SharedErrors,
	TRANSCENDENCE_CHANNEL,
	TRANSCENDENCE_EVENTS,
	TranscendenceEventsTypes
} from '@transcendence/shared';
import {
	IUserRepository,
	IFriendshipRepository,
	UserEnv,
	UserMapper
} from '../index.js';

export class UserService {
	private userRepo: IUserRepository;
	private friendshipRepo: IFriendshipRepository;
	private redisClient: Redis;
	private log: AppLogger;

	constructor(
		redisClient: Redis,
		userRepo: IUserRepository,
		friendshipRepo: IFriendshipRepository
	) {
		this.userRepo = userRepo;
		this.friendshipRepo = friendshipRepo;
		this.redisClient = redisClient;
		this.log = createLogger('UserService');
	}

	/** Private helper to get user friends' ids */
	private async getFriendIds(userId: string): Promise<string[]> {
		const friendships = await this.friendshipRepo.findByUser(userId);
		return friendships.map(friend => friend.userId === userId ? friend.friendId : friend.userId);	
	}

	/** Validación de argumento avatar en updateUser */
	private validateAvatar(avatar?: string): boolean {
		if (!avatar || avatar.trim() === "") return false;
		
		// Validate format and extract base64
		const base64Regex = /^data:image\/(png|jpg|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/;
		const match = avatar.match(base64Regex);
		if (!match) return false;
		
		const [, mimeType, base64Data] = match;
		
		// Validate that base64 is valid
		try {
			Buffer.from(base64Data, 'base64');
		} catch (e) {
			return false;  // Invalid base64
		}
		
		// Validate size (exact, not approximate)
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
				throw new SharedErrors.ServiceError('image', `Failed uploading avatar to Cloudinary`, {
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
					'Image Service returned invalid URL',
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
					'Image Service returned URL with invalid format',
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
					'Image Service returned non-Cloudinary URL',
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
			this.log.error({ err }, 'Failed to upload avatar to Cloudinary');
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
			throw new SharedErrors.ConflictError('Email is already in use', 'email', {
				operation: 'createUser',
				attemptedEmail: data.email
			});
		}
		
		if (usernameTaken) {
			throw new SharedErrors.ConflictError('Username is already in use', 'username', {
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
			throw new SharedErrors.NotFoundError('User does not exist', 'user', {
			userId: id,
			operation: 'updateUser',
			isDeleted: user?.isDeleted
		});
		
		const oldUsername = user.username;
		const oldAvatar = user.avatar;
		
		if (data.avatar !== undefined) {

			// Fallback a url de default avatar
			if (data.avatar === null || data.avatar === '') { 
				data.avatar = UserEnv.CLOUDINARY_DEFAULT_AVATAR();
			}
			
			// It's base64, validate format and convert to cloudinary url
			else if (data.avatar!.startsWith('data:image/')) { 
			
				// Base64 válido, subir a Cloudinary
				if (this.validateAvatar(data.avatar)) { 
					data.avatar = await this.uploadAvatarToCloudinary(data.avatar!, user.avatar);

				// Invalid, discard
				} else { 
					delete data.avatar;
				}

			// Es undefined, borrar
			} else {
				delete data.avatar;
			}
		}
		
		if (data.email && data.email.toLowerCase() !== user.email.toLowerCase()) {
			const isEmailTaken = await this.userRepo.isEmailTaken(data.email);
			if (isEmailTaken)
				throw new SharedErrors.ConflictError('Email is already in use', 'email', {
				operation: 'updateUser',
				userId: id,
				attemptedEmail: data.email
			});
		}
		
		if (data.username && data.username.toLowerCase() !== user.username.toLowerCase()) {
			const isUsernameTaken = await this.userRepo.isUsernameTaken(data.username);
			if (isUsernameTaken)
				throw new SharedErrors.ConflictError('Username is already in use', 'username', {
				operation: 'updateUser',
				userId: id,
				attemptedUsername: data.username
			});
		}
		
		const updatedUser = await this.userRepo.update(id, data);
		
		// Verificamos cambios en username o avatar
		if (updatedUser.username !== oldUsername || updatedUser.avatar !== oldAvatar) {
			this.log.info({ userId: id, oldUsername, newUsername: updatedUser.username }, 'Profile updated');
			
			const friendsIds = await this.getFriendIds(id);

			const eventPayload: TranscendenceEventsTypes.UserProfileUpdatedEvent = {
				type: TRANSCENDENCE_EVENTS.USER_PROFILE_UPDATED,
				timestamp: Date.now(),
				source: 'user-service',
				targetUserId: id,
				payload: {
					userId: id,
					username: updatedUser.username,
					avatar: updatedUser.avatar,
					email: updatedUser.email,
					lastLogoutAt: updatedUser.lastLogoutAt,
					isOnline: updatedUser.isOnline,
					friendsIds,
				}
			} satisfies TranscendenceEventsTypes.UserProfileUpdatedEvent;
			
			// Publicar al canal de eventos
			this.redisClient.publish(TRANSCENDENCE_CHANNEL, JSON.stringify(eventPayload))
				.catch(err => this.log.error({ err }, 'Failed to publish Redis profile update event'));
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