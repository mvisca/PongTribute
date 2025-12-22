// Configurar entorno de pruebas ANTES de importar módulos que leen variables
process.env.NODE_ENV = 'test';
process.env.USER_SERVICE_DB_FULL_PATH = ':memory:';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.SERVICE_SECRET = process.env.SERVICE_SECRET || 'test-service-secret';

import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it, mock } from 'node:test';
import type { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { FRIENDSHIP_STATUS, UserTypes, Utils } from '@transcendence/shared';
import {
	setupTestDB,
	getTestDB,
	resetTestDB,
	closeTestDB
} from './utils/db-test.js';
import { SQLiteFriendshipRepository } from '../src/repositories/SQLiteFriendshipRepository.js';

type UserId = UserTypes.UserId;

function createFakeRedis() {
	const fake: any = {
		on: () => fake,
		quit: async () => {},
		disconnect: () => {}
	};
	return fake as any;
}

function signToken(id: UserId, username: string, email: string): string {
	return jwt.sign({ id, username, email }, process.env.JWT_SECRET || 'test-secret');
}

function insertUser(overrides: Partial<{ id: UserId; username: string; email: string }> = {}): UserId {
	const db = getTestDB();
	const now = Date.now();
	const id = overrides.id ?? (Utils.generateUserId() as UserId);
	const username = overrides.username ?? `user-${Math.random().toString(16).slice(2, 8)}`;
	const email = overrides.email ?? `${username}@test.com`;

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
		email,
		password_hash: 'hashed',
		avatar: 'https://avatar.test/image.png',
		is_online: 0,
		is_deleted: 0,
		has_2fa_enabled: 0,
		created_at: now,
		updated_at: now
	});

	return id;
}

const friendshipRepo = new SQLiteFriendshipRepository(getTestDB());

async function seedFriendship(
	initiatorId: UserId,
	targetId: UserId,
	status: typeof FRIENDSHIP_STATUS[keyof typeof FRIENDSHIP_STATUS]
) {
	return friendshipRepo.create({
		initiatorId,
		friendId: targetId,
		status
	});
}

async function seedFriendshipsForListing() {
	const ownerId = insertUser({
		id: '00000000-0000-0000-0000-0000000000f0' as UserId,
		username: 'owner-list'
	});
	const pendingFriendId = insertUser({
		id: '00000000-0000-0000-0000-0000000000f1' as UserId,
		username: 'pending-friend'
	});
	const acceptedFriendId = insertUser({
		id: '00000000-0000-0000-0000-0000000000f2' as UserId,
		username: 'accepted-friend'
	});
	const rejectedFriendId = insertUser({
		id: '00000000-0000-0000-0000-0000000000f3' as UserId,
		username: 'rejected-friend'
	});

	await seedFriendship(ownerId, pendingFriendId, FRIENDSHIP_STATUS.PENDING);
	await seedFriendship(acceptedFriendId, ownerId, FRIENDSHIP_STATUS.ACCEPTED);
	await seedFriendship(rejectedFriendId, ownerId, FRIENDSHIP_STATUS.REJECTED);

	return { ownerId, pendingFriendId, acceptedFriendId, rejectedFriendId };
}

describe('Friendship API (Fastify inject, in-memory DB)', { concurrency: false }, () => {
	let app: FastifyInstance;
	let redisMock: any = null;

	before(async () => {
		setupTestDB();

		redisMock = mock.method(Utils, 'createRedisClient', () => createFakeRedis());

		const { buildApp } = await import('../src/app.js');
		app = buildApp();
		await app.ready();
	});

	beforeEach(() => {
		resetTestDB();
	});

	after(async () => {
		if (app) await app.close();
		mock.restoreAll();
		closeTestDB();
	});

	it('crea amistad pendiente respetando orden canónico e incluye initiatorId', async () => {
		const friendId = insertUser({ id: '00000000-0000-0000-0000-00000000000a' as UserId, username: 'alice' });
		const initiatorId = insertUser({ id: '00000000-0000-0000-0000-00000000000z' as UserId, username: 'zoe' });
		const token = signToken(initiatorId, 'zoe', 'zoe@test.com');

		const response = await app.inject({
			method: 'POST',
			url: '/api/friendships',
			headers: {
				authorization: `Bearer ${token}`,
				'content-type': 'application/json'
			},
			payload: { friendId }
		});

		assert.equal(response.statusCode, 201);

		const body = response.json();
		assert.equal(body.userId, friendId); // userId debe ser el menor lexicográficamente
		assert.equal(body.friendId, initiatorId);
		assert.equal(body.initiatorId, initiatorId);
		assert.equal(body.status, FRIENDSHIP_STATUS.PENDING);
		assert.ok(Number.isFinite(Date.parse(body.createdAt)));
		assert.ok(Number.isFinite(Date.parse(body.updatedAt)));
	});

	it('omite campos extra del payload y fuerza initiatorId/status desde el servidor', async () => {
		const initiatorId = insertUser({ id: '00000000-0000-0000-0000-000000000011' as UserId, username: 'initiator' });
		const friendId = insertUser({ id: '00000000-0000-0000-0000-000000000012' as UserId, username: 'friend' });
		const token = signToken(initiatorId, 'initiator', 'init@test.com');

		const response = await app.inject({
			method: 'POST',
			url: '/api/friendships',
			headers: {
				authorization: `Bearer ${token}`,
				'content-type': 'application/json'
			},
			payload: {
				friendId,
				initiatorId: 'malicious', // debe ignorarse
				status: FRIENDSHIP_STATUS.ACCEPTED // el servicio lo sobrescribe a PENDING
			}
		});

		assert.equal(response.statusCode, 201);
		const body = response.json();

		assert.equal(body.initiatorId, initiatorId);
		assert.equal(body.status, FRIENDSHIP_STATUS.PENDING);
	});

	it('rechaza solicitudes duplicadas aunque se invierta el orden de los IDs', async () => {
		const initiatorId = insertUser({ id: '00000000-0000-0000-0000-000000000021' as UserId });
		const friendId = insertUser({ id: '00000000-0000-0000-0000-000000000022' as UserId });
		const now = Date.now();
		const db = getTestDB();

		db.prepare(`
			INSERT INTO friendships (user_id, friend_id, initiator_id, status, created_at, updated_at)
			VALUES (@user_id, @friend_id, @initiator_id, @status, @created_at, @updated_at)
		`).run({
			user_id: initiatorId < friendId ? initiatorId : friendId,
			friend_id: initiatorId < friendId ? friendId : initiatorId,
			initiator_id: initiatorId,
			status: FRIENDSHIP_STATUS.ACCEPTED,
			created_at: now,
			updated_at: now
		});

		const token = signToken(friendId, 'right', 'right@test.com');
		const response = await app.inject({
			method: 'POST',
			url: '/api/friendships',
			headers: {
				authorization: `Bearer ${token}`,
				'content-type': 'application/json'
			},
			payload: { friendId: initiatorId }
		});

		assert.equal(response.statusCode, 409);
		const body = response.json();
		assert.equal(body.error, 'Conflict');
		assert.equal(body.message, 'La amistad ya existe');
		assert.equal(body.field, 'friendship');
	});

	it('rechaza crear amistad consigo mismo', async () => {
		const userId = insertUser({ id: '00000000-0000-0000-0000-0000000000aa' as UserId, username: 'self' });
		const token = signToken(userId, 'self', 'self@test.com');

		const response = await app.inject({
			method: 'POST',
			url: '/api/friendships',
			headers: {
				authorization: `Bearer ${token}`,
				'content-type': 'application/json'
			},
			payload: { friendId: userId }
		});

		assert.equal(response.statusCode, 403);
		const body = response.json();
		assert.equal(body.error, 'Forbidden');
		assert.equal(body.field, 'friendId');
	});

	it('valida payload y responde 400 si falta friendId', async () => {
		const userId = insertUser({ id: 'user-missing' as UserId, username: 'missing' });
		const token = signToken(userId, 'missing', 'missing@test.com');

		const response = await app.inject({
			method: 'POST',
			url: '/api/friendships',
			headers: {
				authorization: `Bearer ${token}`,
				'content-type': 'application/json'
			},
			payload: {}
		});

		assert.equal(response.statusCode, 400);
	});

	it('requiere JWT válido', async () => {
		const friendId = insertUser({ id: '00000000-0000-0000-0000-0000000000bb' as UserId, username: 'friend' });

		const response = await app.inject({
			method: 'POST',
			url: '/api/friendships',
			headers: {
				'content-type': 'application/json'
			},
			payload: { friendId }
		});

		assert.equal(response.statusCode, 401);
	});

	it('acepta una solicitud pendiente cuando la confirma el destinatario', async () => {
		const initiatorId = insertUser({ id: '00000000-0000-0000-0000-000000000031' as UserId, username: 'initiator-accept' });
		const targetId = insertUser({ id: '00000000-0000-0000-0000-000000000032' as UserId, username: 'target-accept' });
		await seedFriendship(initiatorId, targetId, FRIENDSHIP_STATUS.PENDING);

		const token = signToken(targetId, 'target-accept', 'target@test.com');
		const response = await app.inject({
			method: 'PATCH',
			url: `/api/friendships/${initiatorId}`,
			headers: {
				authorization: `Bearer ${token}`,
				'content-type': 'application/json'
			},
			payload: { accepted: true }
		});

		assert.equal(response.statusCode, 200);
		const body = response.json();
		assert.equal(body.status, FRIENDSHIP_STATUS.ACCEPTED);
		assert.equal(body.initiatorId, initiatorId);
		assert.ok(Number.isFinite(Date.parse(body.updatedAt)));
	});

	it('rechaza una solicitud pendiente cuando el destinatario responde con accepted false', async () => {
		const initiatorId = insertUser({ id: '00000000-0000-0000-0000-000000000033' as UserId, username: 'initiator-reject' });
		const targetId = insertUser({ id: '00000000-0000-0000-0000-000000000034' as UserId, username: 'target-reject' });
		await seedFriendship(initiatorId, targetId, FRIENDSHIP_STATUS.PENDING);

		const token = signToken(targetId, 'target-reject', 'target-reject@test.com');
		const response = await app.inject({
			method: 'PATCH',
			url: `/api/friendships/${initiatorId}`,
			headers: {
				authorization: `Bearer ${token}`,
				'content-type': 'application/json'
			},
			payload: { accepted: false }
		});

		assert.equal(response.statusCode, 200);
		const body = response.json();
		assert.equal(body.status, FRIENDSHIP_STATUS.REJECTED);
		assert.equal(body.initiatorId, initiatorId);
		assert.ok(Number.isFinite(Date.parse(body.updatedAt)));
	});

	it('rechaza que el solicitante acepte su propia solicitud', async () => {
		const initiatorId = insertUser({ id: '00000000-0000-0000-0000-000000000041' as UserId, username: 'initiator-self' });
		const targetId = insertUser({ id: '00000000-0000-0000-0000-000000000042' as UserId, username: 'target-self' });
		await seedFriendship(initiatorId, targetId, FRIENDSHIP_STATUS.PENDING);

		const token = signToken(initiatorId, 'initiator-self', 'init-self@test.com');
		const response = await app.inject({
			method: 'PATCH',
			url: `/api/friendships/${targetId}`,
			headers: {
				authorization: `Bearer ${token}`,
				'content-type': 'application/json'
			},
			payload: { accepted: true }
		});

		assert.equal(response.statusCode, 403);
		const body = response.json();
		assert.equal(body.error, 'Forbidden');
		assert.equal(body.field, 'friendship');
	});

	it('retorna 409 si la amistad no está pendiente', async () => {
		const initiatorId = insertUser({ id: '00000000-0000-0000-0000-000000000051' as UserId, username: 'initiator-conflict' });
		const targetId = insertUser({ id: '00000000-0000-0000-0000-000000000052' as UserId, username: 'target-conflict' });
		await seedFriendship(initiatorId, targetId, FRIENDSHIP_STATUS.ACCEPTED);

		const token = signToken(targetId, 'target-conflict', 'target-conflict@test.com');
		const response = await app.inject({
			method: 'PATCH',
			url: `/api/friendships/${initiatorId}`,
			headers: {
				authorization: `Bearer ${token}`,
				'content-type': 'application/json'
			},
			payload: { accepted: true }
		});

		assert.equal(response.statusCode, 409);
		const body = response.json();
		assert.equal(body.error, 'Conflict');
		assert.equal(body.field, 'friendship');
	});

	it('retorna 404 si no existe la solicitud', async () => {
		const targetId = insertUser({ id: '00000000-0000-0000-0000-000000000061' as UserId, username: 'target-404' });
		const token = signToken(targetId, 'target-404', 'target-404@test.com');

		const response = await app.inject({
			method: 'PATCH',
			url: `/api/friendships/00000000-0000-0000-0000-000000000099`,
			headers: {
				authorization: `Bearer ${token}`,
				'content-type': 'application/json'
			},
			payload: { accepted: true }
		});

		assert.equal(response.statusCode, 404);
		const body = response.json();
		assert.equal(body.error, 'Not Found');
	});

	it('retorna 400 si falta el campo accepted al actualizar', async () => {
		const initiatorId = insertUser({ id: '00000000-0000-0000-0000-000000000062' as UserId, username: 'initiator-400' });
		const targetId = insertUser({ id: '00000000-0000-0000-0000-000000000063' as UserId, username: 'target-400' });
		await seedFriendship(initiatorId, targetId, FRIENDSHIP_STATUS.PENDING);

		const token = signToken(targetId, 'target-400', 'target-400@test.com');
		const response = await app.inject({
			method: 'PATCH',
			url: `/api/friendships/${initiatorId}`,
			headers: {
				authorization: `Bearer ${token}`,
				'content-type': 'application/json'
			},
			payload: {}
		});

		assert.equal(response.statusCode, 400);
	});

	it('requiere JWT válido para aceptar', async () => {
		const response = await app.inject({
			method: 'PATCH',
			url: '/api/friendships/00000000-0000-0000-0000-000000000088',
			headers: {
				'content-type': 'application/json'
			},
			payload: { accepted: true }
		});

		assert.equal(response.statusCode, 401);
	});

	it('lista todas las amistades del usuario autenticado sin filtro', async () => {
		const { ownerId, pendingFriendId, acceptedFriendId, rejectedFriendId } = await seedFriendshipsForListing();
		const token = signToken(ownerId, 'owner-list', 'owner@test.com');

		const response = await app.inject({
			method: 'GET',
			url: '/api/friendships',
			headers: { authorization: `Bearer ${token}` }
		});

		assert.equal(response.statusCode, 200);

		const friendships = response.json();
		assert.equal(friendships.length, 3);
		assert.deepEqual(friendships.map((f: any) => f.status).sort(), [
			FRIENDSHIP_STATUS.ACCEPTED,
			FRIENDSHIP_STATUS.PENDING,
			FRIENDSHIP_STATUS.REJECTED
		]);
		assert.ok(friendships.every((f: any) => f.userId === ownerId));
		assert.ok(friendships.some((f: any) => f.friendId === pendingFriendId));
		assert.ok(friendships.some((f: any) => f.friendId === acceptedFriendId));
		assert.ok(friendships.some((f: any) => f.friendId === rejectedFriendId));
	});

	it('filtra amistades por estado accepted', async () => {
		const { ownerId, acceptedFriendId } = await seedFriendshipsForListing();
		const token = signToken(ownerId, 'owner-list', 'owner@test.com');

		const response = await app.inject({
			method: 'GET',
			url: '/api/friendships?status=accepted',
			headers: { authorization: `Bearer ${token}` }
		});

		assert.equal(response.statusCode, 200);
		const friendships = response.json();
		assert.equal(friendships.length, 1);
		assert.equal(friendships[0].status, FRIENDSHIP_STATUS.ACCEPTED);
		assert.equal(friendships[0].friendId, acceptedFriendId);
		assert.equal(friendships[0].userId, ownerId);
	});

	it('filtra amistades por estado pending', async () => {
		const { ownerId, pendingFriendId } = await seedFriendshipsForListing();
		const token = signToken(ownerId, 'owner-list', 'owner@test.com');

		const response = await app.inject({
			method: 'GET',
			url: '/api/friendships?status=pending',
			headers: { authorization: `Bearer ${token}` }
		});

		assert.equal(response.statusCode, 200);
		const friendships = response.json();
		assert.equal(friendships.length, 1);
		assert.equal(friendships[0].status, FRIENDSHIP_STATUS.PENDING);
		assert.equal(friendships[0].friendId, pendingFriendId);
		assert.equal(friendships[0].userId, ownerId);
	});

	it('requiere JWT válido para listar amistades', async () => {
		const response = await app.inject({
			method: 'GET',
			url: '/api/friendships'
		});

		assert.equal(response.statusCode, 401);
	});

	it('expone GET /api/friendships con tag Friendship y query status en OpenAPI', async () => {
		const response = await app.inject({
			method: 'GET',
			url: '/docs/json'
		});

		assert.equal(response.statusCode, 200);
		const spec = response.json();
		const getSchema =
			spec.paths?.['/api/friendships']?.get ||
			spec.paths?.['/friendships']?.get;

		assert.ok(getSchema, 'Ruta GET /friendships no encontrada en OpenAPI');
		assert.ok(getSchema.tags?.includes('Friendship'));

		const hasStatusQuery = Array.isArray(getSchema.parameters)
			? getSchema.parameters.some((p: any) => p.in === 'query' && p.name === 'status')
			: false;
		assert.ok(hasStatusQuery, 'Falta parámetro de query status en OpenAPI');
	});

	it('expone PATCH /api/friendships/{friendId} con tag Friendship en OpenAPI', async () => {
		const response = await app.inject({
			method: 'GET',
			url: '/docs/json'
		});

		assert.equal(response.statusCode, 200);
		const spec = response.json();
		const paths = spec.paths || {};
		const patchSchema =
			paths['/api/friendships/{friendId}']?.patch ||
			paths['/friendships/{friendId}']?.patch;

		assert.ok(patchSchema, 'Ruta PATCH /friendships/{friendId} no encontrada en OpenAPI');
		assert.ok(patchSchema.tags?.includes('Friendship'));
	});
});


