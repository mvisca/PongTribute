
import type { Redis } from 'ioredis';
import { createLogger, type AppLogger } from '@transcendence/shared';
import {
	SharedErrors,
	TRANSCENDENCE_CHANNEL,
	TRANSCENDENCE_EVENTS,
	TranscendenceEventsTypes,
	FRIENDSHIP_STATUS,
	FriendshipStatus,
	UserTypes,
	FriendshipTypes
} from '@transcendence/shared';
import { IFriendshipRepository, UserService } from '../index.js';

export class FriendshipService {
	private friendshipRepo: IFriendshipRepository;
	private userService: UserService;
	private redisClient: Redis;
	private log: AppLogger;

	constructor(
		friendshipRepo: IFriendshipRepository,
		userService: UserService,
		redisClient: Redis
	) {
		this.friendshipRepo = friendshipRepo;
		this.userService = userService;
		this.redisClient = redisClient;
		this.log = createLogger('FriendshipService');
	}

	// ============================================================================
	// PRIVATE HELPERS
	// ============================================================================

	private async publishFriendRequest(
		senderId: string,
		senderUsername: string,
		receiverId: string
	): Promise<void> {
		if (!this.redisClient) return;

		// Conseguir avatar del sender (no está en el JWT)
		const sender = await this.userService.findUserById(senderId);

		const event: TranscendenceEventsTypes.FriendRequestEvent = {
			type: TRANSCENDENCE_EVENTS.FRIEND_REQUEST,
			timestamp: Date.now(),
			source: 'user-service',
			payload: {
				senderId,
				senderUsername,
				senderAvatar: sender.avatar,
				receiverId,
			},
		};

		await this.redisClient.publish(TRANSCENDENCE_CHANNEL, JSON.stringify(event));
		this.log.info({ senderId, receiverId }, 'FRIEND_REQUEST published');
	}

	private async publishFriendAccepted(
		acceptorId: UserTypes.UserId,
		acceptorUsername: string,
		requesterId: string
	): Promise<void> {
		if (!this.redisClient) return;

		// Conseguir avatar del acceptor (no está en JWT)
		const acceptor = await this.userService.findUserById(acceptorId);

		const event: TranscendenceEventsTypes.FriendAcceptedEvent = {
			type: TRANSCENDENCE_EVENTS.FRIEND_ACCEPT,
			timestamp: Date.now(),
			source: 'user-service',
			payload: {
				acceptorId,
				acceptorUsername,
				acceptorAvatar: acceptor.avatar,
				requesterId,
			},
		};

		await this.redisClient.publish(TRANSCENDENCE_CHANNEL, JSON.stringify(event));
		this.log.info({ acceptorId, requesterId }, 'FRIEND_ACCEPT published');

	}

	private async publishFriendRemoved(
		removerId: UserTypes.UserId,
		removedId: UserTypes.UserId,
		removerUsername: string
	): Promise<void> {
		if (!this.redisClient) return;

		const event: TranscendenceEventsTypes.FriendRemovedEvent = {
			type: TRANSCENDENCE_EVENTS.FRIEND_REMOVE,
			timestamp: Date.now(),
			source: 'user-service',
			payload: {
				removerId,
				removedId,
				removerUsername,
			},
		} satisfies TranscendenceEventsTypes.FriendRemovedEvent;

		await this.redisClient.publish(TRANSCENDENCE_CHANNEL, JSON.stringify(event));
		this.log.info({ removerId, removedId }, 'FRIEND_REMOVE published');

	}

	private async publishFriendRequestCancelled(
		cancellerId: UserTypes.UserId,
		receiverId: UserTypes.UserId
	): Promise<void> {
		if (!this.redisClient) return;

		const event: TranscendenceEventsTypes.FriendRequestCancelledEvent = {
			type: TRANSCENDENCE_EVENTS.FRIEND_REQUEST_CANCEL,
			timestamp: Date.now(),
			source: 'user-service',
			payload: {
				cancellerId,
				receiverId,
			},
		};

		await this.redisClient.publish(TRANSCENDENCE_CHANNEL, JSON.stringify(event));
		this.log.info({ cancellerId, receiverId }, 'FRIEND_REQUEST_CANCEL published');
	}

	private async publishFriendRequestDeclined(
		declinerId: UserTypes.UserId,
		initiatorId: UserTypes.UserId
	): Promise<void> {
		if (!this.redisClient) return;

		const event: TranscendenceEventsTypes.FriendRequestDeclinedEvent = {
			type: TRANSCENDENCE_EVENTS.FRIEND_REQUEST_DECLINED,
			timestamp: Date.now(),
			source: 'user-service',
			payload: {
				declinerId,
				initiatorId,
			},
		};

		await this.redisClient.publish(TRANSCENDENCE_CHANNEL, JSON.stringify(event));
		this.log.info({ declinerId, initiatorId }, 'FRIEND_REQUEST_DECLINED published');
	}

	private isFriendshipStatus(value: unknown): value is FriendshipStatus {
		return (Object.values(FRIENDSHIP_STATUS) as FriendshipStatus[]).includes(
			value as FriendshipStatus
		);
	}

	private sortIds(userId: UserTypes.UserId, friendId: UserTypes.UserId): [UserTypes.UserId, UserTypes.UserId] {
		return userId < friendId
			? [userId, friendId]
			: [friendId, userId];
	}


	async createFriendship(
		initiatorId: UserTypes.UserId,
		initiatorUsername: string,
		data: FriendshipTypes.CreateFriendshipBody
	): Promise<FriendshipTypes.Friendship> {

		const { friendId } = data;

		if (initiatorId === friendId)
			throw new SharedErrors.ValidationError('You cannot create a friendship with yourself', 'friendId', {
				initiatorId,
				friendId,
				operation: 'createFriendship'
			});

		const [sortedUserId, sortedFriendId] = this.sortIds(initiatorId, friendId);
		const existing = await this.friendshipRepo.findByUserAndFriend(sortedUserId, sortedFriendId);

		if (existing) {
			// Permitir crear si fue rechazada
			if (existing.status === FRIENDSHIP_STATUS.REJECTED) {
				const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 días
				const rejectedAt = existing.updatedAt instanceof Date
					? existing.updatedAt.getTime()
					: new Date(existing.updatedAt).getTime();

				if (Date.now() - rejectedAt < COOLDOWN_MS) {
					throw new SharedErrors.ConflictError(
						'Cannot send a friend request to this user at this time',
						'friendship',
						{
							initiatorId,
							friendId,
							operation: 'createFriendship'
						}
					);
				}

				// Cooldown expirado: borrar rejected y crear nueva
				await this.friendshipRepo.delete(existing.userId, existing.friendId);
				const newFriendship = await this.friendshipRepo.create({
					initiatorId,
					friendId,
					status: FRIENDSHIP_STATUS.PENDING
				});
				this.publishFriendRequest(initiatorId, initiatorUsername, friendId)
					.catch(err => this.log.error({ err }, 'Error publishing friend request event'));
				return newFriendship;
			}

			throw new SharedErrors.ConflictError('Friendship already exists or is pending.', 'friendship', {
				initiatorId,
				friendId,
				operation: 'createFriendship',
				existingStatus: existing.status
			});
		}

		// 1. Guardar en Base de Datos PRIMERO
        const newFriendship = await this.friendshipRepo.create({
            initiatorId,
            friendId,
            status: FRIENDSHIP_STATUS.PENDING
        });
		
		// 2. Notificar DESPUES
		this.publishFriendRequest(initiatorId, initiatorUsername, friendId)			
			.catch(err => this.log.error({ err }, 'Error publishing friend request event'));
			
		return newFriendship;
	}

	async updateFriendshipStatus(
		currentUserId: UserTypes.UserId,
		currentUsername: string,
		friendId: UserTypes.UserId,
		accepted: boolean
	): Promise<FriendshipTypes.Friendship> {

		const [sortedUserId, sortedFriendId] = this.sortIds(currentUserId, friendId);
		const friendship = await this.friendshipRepo.findByUserAndFriend(sortedUserId, sortedFriendId);

		if (!friendship)
			throw new SharedErrors.NotFoundError('Friend request does not exist', 'friendship', {
				currentUserId,
				friendId,
				operation: 'updateFriendshipStatus'
			});

		if (friendship.status !== FRIENDSHIP_STATUS.PENDING)
			throw new SharedErrors.ConflictError('Friendship is not pending', 'friendship', {
				currentUserId,
				friendId,
				operation: 'updateFriendshipStatus',
				currentStatus: friendship.status
			});

		if (friendship.initiatorId === currentUserId)
			throw new SharedErrors.ValidationError(
				'The initiator cannot decide their own request',
				'friendship',
				{
					currentUserId,
					initiatorId: friendship.initiatorId,
					operation: 'updateFriendshipStatus'
				}
			);

		
		const status: FriendshipTypes.FriendshipDecisionStatus = accepted
			? FRIENDSHIP_STATUS.ACCEPTED
			: FRIENDSHIP_STATUS.REJECTED;

		// 1. Actualizar BD
        const updatedFriendship = await this.friendshipRepo.update({
            userId: sortedUserId,
            friendId: sortedFriendId,
            status,
            updatedAt: new Date()
        });

        // 2. Disparar evento SOLO si aceptó
		if (accepted) {
			this.publishFriendAccepted(currentUserId, currentUsername, friendship.initiatorId)
				.catch(err => this.log.error({ err }, 'Error publishing friend accept event'));
		} else {
			this.publishFriendRequestDeclined(currentUserId, friendship.initiatorId)
				.catch(err => this.log.error({ err }, 'Error publishing friend request declined event'));
		}

        return updatedFriendship;
	}


	async listFriendships(
		userId: UserTypes.UserId,
		{ status }: FriendshipTypes.ListFriendshipsQuery = {}
	): Promise<FriendshipTypes.Friendship[]> {

		if (status == null)
			return await this.friendshipRepo.findByUser(userId);

		if (status) {
			if (!this.isFriendshipStatus(status))
				throw new SharedErrors.ValidationError('Invalid friendship status', 'status', {
					userId,
					attemptedStatus: status,
					operation: 'listFriendships',
					validStatuses: Object.values(FRIENDSHIP_STATUS)
				});
			return await this.friendshipRepo.findByUserAndStatus(userId, status);
		}

		return await this.friendshipRepo.findByUser(userId);
	}


	async deleteFriendship(
		currentUserId: UserTypes.UserId,
		friendId: UserTypes.UserId
	): Promise<void> {
		const [ sortedUserId, sortedFriendId ] = this.sortIds(currentUserId, friendId);
		const friendship = await this.friendshipRepo.findByUserAndFriend(sortedUserId, sortedFriendId);
	
		if (!friendship) {
			throw new SharedErrors.NotFoundError(`Friendship does not exist`, 'friendship', {
				currentUserId,
				friendId,
				operation: 'deleteFriendship'
			});
		}

		if (friendship.status !== FRIENDSHIP_STATUS.ACCEPTED) {
			throw new SharedErrors.ConflictError('Only active friendships can be deleted', 'friendship', {
				currentUserId,
				friendId,
				operation: 'deleteFriendship',
				currentStatus: friendship.status
			});
		}

		// 1. Borrar de BD
        await this.friendshipRepo.delete(sortedUserId, sortedFriendId);

		// 2. Disparar evento
		const remover = await this.userService.findUserById(currentUserId);
		this.publishFriendRemoved(currentUserId, friendId, remover.username)
			.catch(err => this.log.error({ err }, 'Error publishing friend remove event'));
	}

	async cancelFriendRequest(
		initiatorId: UserTypes.UserId,
		friendId: UserTypes.UserId
	): Promise<void> {
		const [sortedUserId, sortedFriendId] = this.sortIds(initiatorId, friendId);
		const friendship = await this.friendshipRepo.findByUserAndFriend(sortedUserId, sortedFriendId);

		if (!friendship) {
			throw new SharedErrors.NotFoundError('Friend request does not exist', 'friendship', {
				initiatorId,
				friendId,
				operation: 'cancelFriendRequest'
			});
		}

		if (friendship.status !== FRIENDSHIP_STATUS.PENDING) {
			throw new SharedErrors.ConflictError('Only pending requests can be cancelled', 'friendship', {
				initiatorId,
				friendId,
				operation: 'cancelFriendRequest',
				currentStatus: friendship.status
			});
		}

		if (friendship.initiatorId !== initiatorId) {
			throw new SharedErrors.ValidationError(
				'Only the request initiator can cancel it',
				'friendship',
				{
					initiatorId,
					actualInitiator: friendship.initiatorId,
					operation: 'cancelFriendRequest'
				}
			);
		}

		// 1. Borrar de BD
		await this.friendshipRepo.delete(sortedUserId, sortedFriendId);

		// 2. Notificar al receptor para que borre de su pending
		this.publishFriendRequestCancelled(initiatorId, friendId)
			.catch(err => this.log.error({ err }, 'Error publishing friend request cancel event'));
	}
}

