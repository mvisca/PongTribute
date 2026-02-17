import { SharedErrors, FRIENDSHIP_STATUS, UserTypes } from '@transcendence/shared';
import * as FriendshipTypes from '@transcendence/shared';
import { IFriendshipRepository, SQLiteFriendshipRepository } from '../index.js';

export class FriendshipService {
	private friendshipRepo: IFriendshipRepository;

	constructor(friendshipRepo: IFriendshipRepository = new SQLiteFriendshipRepository()) {
		this.friendshipRepo = friendshipRepo;
	}

	private isFriendshipStatus(value: unknown): value is FriendshipTypes.FriendshipStatus {
		return (Object.values(FRIENDSHIP_STATUS) as FriendshipTypes.FriendshipStatus[]).includes(
			value as FriendshipTypes.FriendshipStatus
		);
	}

	private sortIds(userId: UserTypes.UserId, friendId: UserTypes.UserId): [UserTypes.UserId, UserTypes.UserId] {
		return userId < friendId
			? [userId, friendId]
			: [friendId, userId];
	}

	async createFriendship(
		initiatorId: UserTypes.UserId,
		data: FriendshipTypes.CreateFriendshipBody
	): Promise<FriendshipTypes.Friendship> {

		const { friendId } = data;

		if (initiatorId === friendId)
			throw new SharedErrors.ValidationError('No puedes crear amistad contigo mismo', 'friendId', {
				initiatorId,
				friendId,
				operation: 'createFriendship'
			});

		const [sortedUserId, sortedFriendId] = this.sortIds(initiatorId, friendId);
		const existing = await this.friendshipRepo.findByUserAndFriend(sortedUserId, sortedFriendId);

		if (existing)
			throw new SharedErrors.ConflictError('La amistad ya existe', 'friendship', {
				initiatorId,
				friendId,
				operation: 'createFriendship',
				existingStatus: existing.status
			});

		return await this.friendshipRepo.create({
			initiatorId,
			friendId,
			status: FRIENDSHIP_STATUS.PENDING
		});
	}

	async updateFriendshipStatus(
		currentUserId: UserTypes.UserId,
		friendId: UserTypes.UserId,
		accepted: boolean
	): Promise<FriendshipTypes.Friendship> {

		const [sortedUserId, sortedFriendId] = this.sortIds(currentUserId, friendId);
		const friendship = await this.friendshipRepo.findByUserAndFriend(sortedUserId, sortedFriendId);

		if (!friendship)
			throw new SharedErrors.NotFoundError('No existe la solicitud de amistad', 'friendship', {
				currentUserId,
				friendId,
				operation: 'updateFriendshipStatus'
			});

		if (friendship.status !== FRIENDSHIP_STATUS.PENDING)
			throw new SharedErrors.ConflictError('La amistad no está pendiente', 'friendship', {
				currentUserId,
				friendId,
				operation: 'updateFriendshipStatus',
				currentStatus: friendship.status
			});

		if (friendship.initiatorId === currentUserId)
			throw new SharedErrors.ValidationError(
				'El solicitante no puede decidir su propia solicitud',
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

		return await this.friendshipRepo.update({
			userId: sortedUserId,
			friendId: sortedFriendId,
			status,
			updatedAt: new Date()
		});
	}

	async listFriendships(
		userId: UserTypes.UserId,
		{ status }: FriendshipTypes.ListFriendshipsQuery = {}
	): Promise<FriendshipTypes.Friendship[]> {

		if (status == null)
			return await this.friendshipRepo.findByUser(userId);

		if (status) {
			if (!this.isFriendshipStatus(status))
				throw new SharedErrors.ValidationError('Estado de amistad inválido', 'status', {
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
			throw new SharedErrors.NotFoundError(`No existe la amistad`, 'friendship', {
				currentUserId,
				friendId,
				operation: 'deleteFriendship'
			});
		}

		if (friendship.status !== FRIENDSHIP_STATUS.ACCEPTED) {
			throw new SharedErrors.ConflictError('Solo se pueden eliminar amistades activas', 'friendship', {
				currentUserId,
				friendId,
				operation: 'deleteFriendship',
				currentStatus: friendship.status
			});
		}

		await this.friendshipRepo.delete(sortedUserId, sortedFriendId);
	}
}

