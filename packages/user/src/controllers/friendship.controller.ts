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

	private errorHandler(err: unknown, request: FastifyRequest, reply: FastifyReply): void {
		if (err instanceof SharedErrors.ConflictError) {
			reply.code(409).send({ error: 'Conflict', message: err.message, field: err.field });
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
}

