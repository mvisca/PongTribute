import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	FRIENDSHIP_STATUS,
	type Friendship,
	type FriendshipRow,
	UserTypes
} from '@transcendence/shared';

import { FriendshipMapper } from '../src/mappers/FriendshipMapper.js';

describe('FriendshipMapper', () => {

	const baseUserId: UserTypes.UserId = '11111111-1111-1111-1111-111111111111';
	const baseFriendId: UserTypes.UserId = '22222222-2222-2222-2222-222222222222';
	const baseInitiatorId: UserTypes.UserId = '33333333-3333-3333-3333-333333333333';

	it('convierte row en respuesta de dominio preservando initiatorId y fechas', () => {
		const createdAt = new Date('2024-05-10T12:00:00Z');
		const updatedAt = new Date('2024-05-11T15:30:00Z');

		const row: FriendshipRow = {
			user_id: baseUserId,
			friend_id: baseFriendId,
			initiator_id: baseInitiatorId,
			status: FRIENDSHIP_STATUS.PENDING,
			created_at: createdAt.getTime(),
			updated_at: updatedAt.getTime()
		};

		const result = FriendshipMapper.rowToFriendshipResponse(row);

		assert.equal(result.userId, baseUserId);
		assert.equal(result.friendId, baseFriendId);
		assert.equal(result.initiatorId, baseInitiatorId);
		assert.equal(result.status, FRIENDSHIP_STATUS.PENDING);
		assert.ok(result.createdAt instanceof Date);
		assert.ok(result.updatedAt instanceof Date);
		assert.equal(result.createdAt.getTime(), row.created_at);
		assert.equal(result.updatedAt.getTime(), row.updated_at);
	});

	it('transforma datos de dominio en row lista para INSERT con timestamps numéricos', () => {
		const now = new Date('2024-06-01T10:20:30Z');

		const data: Friendship = {
			userId: baseUserId,
			friendId: baseFriendId,
			initiatorId: baseInitiatorId,
			status: FRIENDSHIP_STATUS.ACCEPTED,
			createdAt: now,
			updatedAt: now
		};

		const row = FriendshipMapper.dataToInsert(data);

		assert.equal(row.user_id, baseUserId);
		assert.equal(row.friend_id, baseFriendId);
		assert.equal(row.initiator_id, baseInitiatorId);
		assert.equal(row.status, FRIENDSHIP_STATUS.ACCEPTED);
		assert.equal(row.created_at, now.getTime());
		assert.equal(row.updated_at, now.getTime());
		assert.equal(typeof row.created_at, 'number');
		assert.equal(typeof row.updated_at, 'number');
	});

	it('prepara datos de actualización manteniendo IDs y status', () => {
		const updatedAt = new Date('2024-07-01T00:00:00Z');

		const row = FriendshipMapper.dataToSet({
			userId: baseUserId,
			friendId: baseFriendId,
			status: FRIENDSHIP_STATUS.REJECTED,
			updatedAt
		});

		assert.equal(row.user_id, baseUserId);
		assert.equal(row.friend_id, baseFriendId);
		assert.equal(row.status, FRIENDSHIP_STATUS.REJECTED);
		assert.equal(row.updated_at, updatedAt.getTime());
		assert.equal(typeof row.updated_at, 'number');
	});
});

