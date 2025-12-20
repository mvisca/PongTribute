import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';

import { FRIENDSHIP_STATUS, UserTypes } from '@transcendence/shared';
import { SQLiteFriendshipRepository } from '../src/repositories/SQLiteFriendshipRepository.js';
import {
	getTestDB,
	resetTestDB,
	closeTestDB
} from './utils/db-test.js';

type UserId = UserTypes.UserId;

const db = getTestDB();
const repository = new SQLiteFriendshipRepository(db);

let userCounter = 0;

function insertUser(overrides: Partial<{ id: UserId; username: string }> = {}): UserId {
	const count = ++userCounter;
	const id = overrides.id ?? (`user-${count}` as UserId);
	const now = Date.now();
	const username = overrides.username ?? `user${count}`;

	db.prepare(`
		INSERT INTO users (
			id, username, email, password_hash, avatar,
			is_online, is_deleted, has_2fa_enabled, created_at, updated_at
		) VALUES (
			@id, @username, LOWER(@email), @password_hash, @avatar,
			@is_online, @is_deleted, @has_2fa_enabled, @created_at, @updated_at
		)
	`).run({
		id,
		username,
		email: `${username}@test.com`,
		password_hash: `hash-${count}`,
		avatar: `https://avatar/${count}.png`,
		is_online: 0,
		is_deleted: 0,
		has_2fa_enabled: 0,
		created_at: now,
		updated_at: now
	});

	return id;
}

// Ejecutamos en serie para evitar colisiones de PK/UNIQUE en la misma DB en memoria
describe('SQLiteFriendshipRepository (DB en memoria)', { concurrency: false }, () => {
	beforeEach(() => {
		resetTestDB();
		userCounter = 0;
	});

	after(() => {
		closeTestDB();
	});

	it('crea amistad ordenando IDs de forma canónica y conserva initiatorId', async () => {
		const smallerId = insertUser({ id: 'a-user' as UserId });
		const biggerId = insertUser({ id: 'z-user' as UserId });

		const friendship = await repository.create({
			initiatorId: biggerId,
			friendId: smallerId,
			status: FRIENDSHIP_STATUS.PENDING
		});

		assert.equal(friendship.userId, smallerId);
		assert.equal(friendship.friendId, biggerId);
		assert.equal(friendship.initiatorId, biggerId);
		assert.equal(friendship.status, FRIENDSHIP_STATUS.PENDING);
		assert.ok(friendship.createdAt instanceof Date);
		assert.ok(friendship.updatedAt instanceof Date);
	});

	it('findByUserAndFriend recupera la amistad sin importar el orden', async () => {
		const userA = insertUser({ id: '111' as UserId });
		const userB = insertUser({ id: '222' as UserId });

		await repository.create({
			initiatorId: userA,
			friendId: userB,
			status: FRIENDSHIP_STATUS.PENDING
		});

		const storedDirect = await repository.findByUserAndFriend(userA, userB);
		const storedInverted = await repository.findByUserAndFriend(userB, userA);

		assert.ok(storedDirect);
		assert.ok(storedInverted);
		assert.equal(storedDirect?.userId, storedInverted?.userId);
		assert.equal(storedDirect?.friendId, storedInverted?.friendId);
		assert.equal(storedDirect?.initiatorId, userA);
	});

	it('update cambia el status y updatedAt sin modificar createdAt', async () => {
		const userA = insertUser({ id: 'aaa' as UserId });
		const userB = insertUser({ id: 'bbb' as UserId });

		const created = await repository.create({
			initiatorId: userA,
			friendId: userB,
			status: FRIENDSHIP_STATUS.PENDING
		});

		const newDate = new Date('2024-08-20T10:00:00Z');
		const updated = await repository.update({
			userId: created.userId,
			friendId: created.friendId,
			status: FRIENDSHIP_STATUS.ACCEPTED,
			updatedAt: newDate
		});

		assert.equal(updated.status, FRIENDSHIP_STATUS.ACCEPTED);
		assert.equal(updated.updatedAt.getTime(), newDate.getTime());
		assert.equal(updated.createdAt.getTime(), created.createdAt.getTime());
	});

	it('findByUser retorna todas las amistades (enviadas y recibidas) y findByUserAndStatus filtra por estado', async () => {
		const userA = insertUser({ id: 'u1' as UserId });
		const userB = insertUser({ id: 'u2' as UserId });
		const userC = insertUser({ id: 'u3' as UserId });

		await repository.create({
			initiatorId: userA,
			friendId: userB,
			status: FRIENDSHIP_STATUS.PENDING
		});
		await repository.create({
			initiatorId: userC,
			friendId: userB,
			status: FRIENDSHIP_STATUS.ACCEPTED
		});

		const friendshipsForB = await repository.findByUser(userB);
		const acceptedForB = await repository.findByUserAndStatus(userB, FRIENDSHIP_STATUS.ACCEPTED);

		assert.equal(friendshipsForB.length, 2);
		assert.ok(friendshipsForB.some(f => f.userId === userA || f.friendId === userA));
		assert.ok(friendshipsForB.some(f => f.userId === userC || f.friendId === userC));

		assert.equal(acceptedForB.length, 1);
		assert.equal(acceptedForB[0]?.status, FRIENDSHIP_STATUS.ACCEPTED);
	});

	it('delete elimina la relación y deja de aparecer en búsquedas', async () => {
		const userA = insertUser({ id: 'left' as UserId });
		const userB = insertUser({ id: 'right' as UserId });

		const friendship = await repository.create({
			initiatorId: userA,
			friendId: userB,
			status: FRIENDSHIP_STATUS.PENDING
		});

		await repository.delete(friendship.userId, friendship.friendId);

		const afterDelete = await repository.findByUserAndFriend(userA, userB);
		const listForUser = await repository.findByUser(userA);

		assert.equal(afterDelete, null);
		assert.equal(listForUser.length, 0);
	});
});

