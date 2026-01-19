import { FastifyReply, FastifyRequest } from 'fastify';
import { SharedErrors } from '@transcendence/shared';
import * as FriendshipTypes from '@transcendence/shared';
import { FriendshipService } from '../index.js';

/** Controller de Friendship - Maneja peticiones HTTP relacionadas con amistades */
export class FriendshipController {
	private friendshipService: FriendshipService;

	constructor() {
		this.friendshipService = new FriendshipService();
	}

	private buildNotFoundPayload(err: { message: string; field?: string }): Record<string, unknown> {
		const payload: Record<string, unknown> = { error: 'Not Found', message: err.message };
		if ('field' in err && typeof err.field === 'string')
			payload.field = err.field;
		return payload;
	}

	// TODO mirar la forma en que se manejan los errores, no es consistente con la centralizada
	private errorHandler(err: unknown, request: FastifyRequest, reply: FastifyReply): void {
		if (err instanceof SharedErrors.ConflictError) {
			reply.code(409).send({ error: 'Conflict', message: err.message, field: err.field });
			return;
		}

		if (err instanceof SharedErrors.NotFoundError) {
			reply.code(404).send(this.buildNotFoundPayload(err));
			return;
		}

		if (err instanceof SharedErrors.ValidationError) {
			reply.code(403).send({ error: 'Forbidden', message: err.message, field: err.field });
			return;
		}

		request.log.error(err);
		const message = err instanceof Error ? err.message : 'Unknown Error';
		reply.code(500).send({ error: 'Internal Server Error', message });
	}

	// ============================================================================
	// CREATE FRIENDSHIP
	// ============================================================================
	async createFriendship(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const initiatorId = request.user?.id;

			if (!initiatorId) {
				reply.code(401).send({
					error: 'Unauthorized',
					message: 'Usuario no autenticado'
				});
				return;
			}

			const data = request.body as FriendshipTypes.CreateFriendshipBody;
			const friendship = await this.friendshipService.createFriendship(initiatorId, data);
			return reply.code(201).send(friendship);
		} catch (err) {
			return this.errorHandler(err, request, reply);
		}
	}

	// ============================================================================
	// UPDATE FRIENDSHIP (ACCEPT / REJECT)
	// ============================================================================
	async updateFriendship(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const currentUserId = request.user?.id;

			if (!currentUserId) {
				reply.code(401).send({
					error: 'Unauthorized',
					message: 'Usuario no autenticado'
				});
				return;
			}

			const { friendId } = request.params as FriendshipTypes.UpdateFriendshipParams;
			const { accepted } = request.body as FriendshipTypes.UpdateFriendshipBody;
			const friendship = await this.friendshipService.updateFriendshipStatus(currentUserId, friendId, accepted);
			return reply.code(200).send(friendship);
		} catch (err) {
			return this.errorHandler(err, request, reply);
		}
	}

	// ============================================================================
	// LIST FRIENDSHIPS
	// ============================================================================
	async listFriendships(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const userId = request.user?.id;

			if (!userId) {
				reply.code(401).send({
					error: 'Unauthorized',
					message: 'Usuario no autenticado'
				});
				return;
			}

			const query = request.query as FriendshipTypes.ListFriendshipsQuery;
			const friendships = await this.friendshipService.listFriendships(userId, query);
			return reply.code(200).send(friendships);
		} catch (err) {
			return this.errorHandler(err, request, reply);
		}
	}
}

