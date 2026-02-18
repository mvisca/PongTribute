import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
	FRIENDSHIP_STATUS,
	SharedErrors,
	UserTypes,
	FriendshipTypes
} from '@transcendence/shared';
import { FriendshipService } from '../src/services/friendship.service.js';
import { IFriendshipRepository } from '../src/repositories/IFriendshipRepository.js';

type UserId = UserTypes.UserId;

function buildFriendship(
	overrides: Partial<FriendshipTypes.Friendship> = {}
): FriendshipTypes.Friendship {
	const baseDate = new Date('2024-01-01T00:00:00.000Z');

	return {
		userId: 'user-a' as UserId,
		friendId: 'user-b' as UserId,
		initiatorId: 'user-a' as UserId,
		status: FRIENDSHIP_STATUS.PENDING,
		createdAt: baseDate,
		updatedAt: baseDate,
		...overrides
	};
}

class FakeFriendshipRepository implements IFriendshipRepository {
	public findCalls: Array<[UserId, UserId]> = [];
	public createCalls: FriendshipTypes.CreateFriendshipData[] = [];
	public findByUserCalls: Array<UserId> = [];
	public findByUserAndStatusCalls: Array<[UserId, FriendshipTypes.FriendshipDecisionStatus]> = [];
	public findByUserAndFriendResponse: FriendshipTypes.Friendship | null = null;
	public findByUserResponse: FriendshipTypes.Friendship[] = [];
	public findByUserAndStatusResponse: FriendshipTypes.Friendship[] = [];
	public createResult: FriendshipTypes.Friendship | null = null;

	async create(data: FriendshipTypes.CreateFriendshipData): Promise<FriendshipTypes.Friendship> {
		this.createCalls.push(data);

		if (this.createResult) return this.createResult;

		const now = new Date();
		const [userId, friendId] = data.initiatorId < data.friendId
			? [data.initiatorId, data.friendId]
			: [data.friendId, data.initiatorId];

		return buildFriendship({
			userId,
			friendId,
			initiatorId: data.initiatorId,
			status: data.status,
			createdAt: now,
			updatedAt: now
		});
	}

	async update(): Promise<FriendshipTypes.Friendship> {
		throw new Error('update not implemented in FakeFriendshipRepository');
	}

	async delete(): Promise<void> {
		// No-op en pruebas unitarias
	}

	async findByUserAndFriend(userId: UserId, friendId: UserId): Promise<FriendshipTypes.Friendship | null> {
		this.findCalls.push([userId, friendId]);
		return this.findByUserAndFriendResponse;
	}

	async findByUser(userId: UserId): Promise<FriendshipTypes.Friendship[]> {
		this.findByUserCalls.push(userId);
		return this.findByUserResponse;
	}

	async findByUserAndStatus(
		userId: UserId,
		status: FriendshipTypes.FriendshipDecisionStatus
	): Promise<FriendshipTypes.Friendship[]> {
		this.findByUserAndStatusCalls.push([userId, status]);
		return this.findByUserAndStatusResponse;
	}
}

describe('FriendshipService (unit con dobles de repositorio)', () => {
	let fakeRepo: FakeFriendshipRepository;
	let service: FriendshipService;

	beforeEach(() => {
		fakeRepo = new FakeFriendshipRepository();
		service = new FriendshipService(fakeRepo);
	});

	it('rechaza solicitudes de amistad hacia uno mismo', async () => {
		const userId = 'user-self' as UserId;

		await assert.rejects(
			async () => service.createFriendship(userId, { friendId: userId }),
			(err: unknown) => {
				assert.ok(err instanceof SharedErrors.ValidationError);
				assert.equal(err.field, 'friendId');
				assert.equal(err.message, 'No puedes crear amistad contigo mismo');
				return true;
			}
		);

		assert.equal(fakeRepo.findCalls.length, 0);
		assert.equal(fakeRepo.createCalls.length, 0);
	});

	it('lanza ConflictError si la relación ya existe y no intenta crearla de nuevo', async () => {
		const initiatorId = 'user-a' as UserId;
		const friendId = 'user-b' as UserId;

		fakeRepo.findByUserAndFriendResponse = buildFriendship({
			userId: initiatorId,
			friendId,
			initiatorId,
			status: FRIENDSHIP_STATUS.ACCEPTED
		});

		await assert.rejects(
			async () => service.createFriendship(initiatorId, { friendId }),
			(err: unknown) => {
				assert.ok(err instanceof SharedErrors.ConflictError);
				assert.equal(err.field, 'friendship');
				assert.equal(err.message, 'La amistad ya existe');
				return true;
			}
		);

		assert.deepEqual(fakeRepo.findCalls, [[initiatorId, friendId]]);
		assert.equal(fakeRepo.createCalls.length, 0);
	});

	it('crea amistad pendiente usando orden canónico en la búsqueda y conserva initiatorId', async () => {
		const initiatorId = 'z-user' as UserId;
		const friendId = 'a-user' as UserId;

		const expected = buildFriendship({
			userId: friendId,
			friendId: initiatorId,
			initiatorId,
			status: FRIENDSHIP_STATUS.PENDING,
			createdAt: new Date('2024-08-01T10:00:00.000Z'),
			updatedAt: new Date('2024-08-01T10:00:00.000Z')
		});

		fakeRepo.createResult = expected;

		const result = await service.createFriendship(initiatorId, { friendId });

		assert.deepEqual(fakeRepo.findCalls, [[friendId, initiatorId]]);
		assert.equal(fakeRepo.createCalls.length, 1);
		assert.deepEqual(fakeRepo.createCalls[0], {
			initiatorId,
			friendId,
			status: FRIENDSHIP_STATUS.PENDING
		});

		assert.deepEqual(result, expected);
	});

	it('listFriendships sin filtro delega en findByUser y retorna el resultado', async () => {
		const userId = 'user-list' as UserId;
		const expected = [
			buildFriendship({ userId, friendId: 'friend-1' as UserId }),
			buildFriendship({ userId, friendId: 'friend-2' as UserId, status: FRIENDSHIP_STATUS.ACCEPTED })
		];

		fakeRepo.findByUserResponse = expected;

		const result = await service.listFriendships(userId, {});

		assert.deepEqual(fakeRepo.findByUserCalls, [userId]);
		assert.equal(fakeRepo.findByUserAndStatusCalls.length, 0);
		assert.deepEqual(result, expected);
	});

	it('listFriendships con filtro delega en findByUserAndStatus y retorna el resultado', async () => {
		const userId = 'user-filter' as UserId;
		const expected = [buildFriendship({ userId, friendId: 'friend-accepted' as UserId, status: FRIENDSHIP_STATUS.ACCEPTED })];

		fakeRepo.findByUserAndStatusResponse = expected;

		const result = await service.listFriendships(userId, { status: FRIENDSHIP_STATUS.ACCEPTED });

		assert.deepEqual(fakeRepo.findByUserAndStatusCalls, [[userId, FRIENDSHIP_STATUS.ACCEPTED]]);
		assert.equal(fakeRepo.findByUserCalls.length, 0);
		assert.deepEqual(result, expected);
	});

	it('listFriendships lanza ValidationError si el status es inválido', async () => {
		const userId = 'user-invalid' as UserId;

		await assert.rejects(
			service.listFriendships(userId, { status: 'wrong' as any }),
			(err: unknown) => {
				assert.ok(err instanceof SharedErrors.ValidationError);
				assert.equal(err.field, 'status');
				return true;
			}
		);

		assert.equal(fakeRepo.findByUserCalls.length, 0);
		assert.equal(fakeRepo.findByUserAndStatusCalls.length, 0);
	});
});

