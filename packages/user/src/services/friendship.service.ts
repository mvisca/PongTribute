import { SharedErrors, FRIENDSHIP_STATUS, UserTypes } from '@transcendence/shared';
import * as FriendshipTypes from '@transcendence/shared';
import { IFriendshipRepository, SQLiteFriendshipRepository } from '../index.js';

export class FriendshipService {
	private friendshipRepo: IFriendshipRepository;

	constructor(friendshipRepo: IFriendshipRepository = new SQLiteFriendshipRepository()) {
		this.friendshipRepo = friendshipRepo;
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
			throw new SharedErrors.ValidationError('No puedes crear amistad contigo mismo', 'friendId');

		const [sortedUserId, sortedFriendId] = this.sortIds(initiatorId, friendId);
		const existing = await this.friendshipRepo.findByUserAndFriend(sortedUserId, sortedFriendId);

		if (existing)
			throw new SharedErrors.ConflictError('La amistad ya existe', 'friendship');

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
			throw new SharedErrors.NotFoundError('No existe la solicitud de amistad', 'friendship');

		if (friendship.status !== FRIENDSHIP_STATUS.PENDING)
			throw new SharedErrors.ConflictError('La amistad no está pendiente', 'friendship');

		if (friendship.initiatorId === currentUserId)
			throw new SharedErrors.ValidationError(
				'El solicitante no puede decidir su propia solicitud',
				'friendship'
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
}

