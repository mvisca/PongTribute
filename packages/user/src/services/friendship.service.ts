import { SharedErrors, FRIENDSHIP_STATUS, UserTypes } from '@transcendence/shared';
import * as FriendshipTypes from '@transcendence/shared';
import { IFriendshipRepository, SQLiteFriendshipRepository } from '../index.js';

export class FriendshipService {
	private friendshipRepo: IFriendshipRepository;

	constructor() {
		this.friendshipRepo = new SQLiteFriendshipRepository();
	}

	private sortIds(userId: UserTypes.UserId, friendId: UserTypes.UserId): [UserTypes.UserId, UserTypes.UserId] {
		return userId < friendId
			? [userId, friendId]
			: [friendId, userId];
	}

	async createFriendship(
		data: FriendshipTypes.CreateFriendshipBody
	): Promise<FriendshipTypes.Friendship> {

		const { userId, friendId } = data;

		if (userId === friendId)
			throw new SharedErrors.ValidationError('No puedes crear amistad contigo mismo', 'friendId');

		const [sortedUserId, sortedFriendId] = this.sortIds(userId, friendId);
		const existing = await this.friendshipRepo.findByUserAndFriend(sortedUserId, sortedFriendId);

		if (existing)
			throw new SharedErrors.ConflictError('La amistad ya existe', 'friendship');

		return await this.friendshipRepo.create({
			userId: sortedUserId,
			friendId: sortedFriendId,
			status: FRIENDSHIP_STATUS.PENDING
		});
	}
}

