import { FastifyReply, FastifyRequest } from 'fastify';
import { 
	SharedErrors,
	REDIS_CHANNEL,
	TRANSCENDENCE_EVENTS,
	TranscendenceEventsTypes,
	AuthTypes
} from '@transcendence/shared';
import * as FriendshipTypes from '@transcendence/shared'; // TODO narrow este import
import { 
	FriendshipService,
	UserService
} from '../index.js';
import { redisClient } from '../index.js';

/** Controller de Friendship - Maneja peticiones HTTP relacionadas con amistades */
export class FriendshipController {
	private friendshipService: FriendshipService;
	private userService: UserService;

	constructor() {
		this.friendshipService = new FriendshipService();
		this.userService = new UserService();
	}

	// ============================================================================
	// PRIVATE HELPERS
	// ============================================================================

	private async publishFriendRequest(
		senderId: string,
		senderUsername: string,
		receiverId: string
	): Promise<void> {
		if (!redisClient) return;

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

		await redisClient.publish(REDIS_CHANNEL, JSON.stringify(event));
		console.log(`[FriendshipController] FRIEND_REQUEST publicado: de ${senderId} a ${receiverId}`);
	}

	private async publishFriendAccepted(
		acceptorId: FriendshipTypes.UserTypes.UserId, // TODO hacer este import no dependiente de FriendshipTypes
		acceptorUsername: string,
		requesterId: string
	): Promise<void> {
		if (!redisClient) return;

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

		await redisClient.publish(REDIS_CHANNEL, JSON.stringify(event));
		console.log(`[FriendshipController] FRIEND_ACCEPT publicado: de ${acceptorId} a ${requesterId}`);
	}

	private async publishFriendRemoved(
		removerId: FriendshipTypes.UserTypes.UserId,
		removedId: FriendshipTypes.UserTypes.UserId
	): Promise<void> {
		if (!redisClient) return;

		const event: TranscendenceEventsTypes.FriendRemovedEvent = {
			type: TRANSCENDENCE_EVENTS.FRIEND_REMOVE,
			timestamp: Date.now(),
			source: 'user-service',
			payload: {
				removerId,
				removedId,
			},
		};

		await redisClient.publish(REDIS_CHANNEL, JSON.stringify(event));
		console.log(`[FriendshipController] FRIEND_REMOVE publicado: ${removerId} elimino ${removedId}`);
	}

	// ============================================================================
	// CREATE FRIENDSHIP
	// ============================================================================
	async createFriendship(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const user = request.user as AuthTypes.AccessTokenPayload;

			if (!user.id) {
				reply.code(401).send({
					error: 'Unauthorized',
					message: 'Usuario no autenticado'
				});
				return;
			}

			// Lee el destinatario de la invitacion del body del request
			const data = request.body as FriendshipTypes.CreateFriendshipBody;

			// Crea la amistad
			const friendship = await this.friendshipService.createFriendship(user.id, data);

			// Publicar evento en canal TRANSCENDENCE_EVENTS
			this.publishFriendRequest(user.id, user.username, data.friendId)
				.catch((err: Error) => console.error('[FriendshipController] Error publicando FRIEND_REQUEST:', err));

			return reply.code(201).send(friendship);
		} catch (err) {
			return SharedErrors.handleError(err, reply);
		}
	}

	// ============================================================================
	// UPDATE FRIENDSHIP (ACCEPT / REJECT)
	// ============================================================================
	async updateFriendship(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		try {
			const user = request.user as AuthTypes.AccessTokenPayload;

			if (!user.id) {
				reply.code(401).send({
					error: 'Unauthorized',
					message: 'Usuario no autenticado'
				});
				return;
			}

			const { friendId } = request.params as FriendshipTypes.UpdateFriendshipParams;
			const { accepted } = request.body as FriendshipTypes.UpdateFriendshipBody;
			const friendship = await this.friendshipService.updateFriendshipStatus(user.id, friendId, accepted);

			if (accepted) {
				// friendship.initiatiorId es quien envió la solicitud original (requesterId)
				this.publishFriendAccepted(user.id, user.username, friendship.initiatorId)
					.catch((err: Error) => console.error('[FriendshipController] Error publicando FRIEND_ACCEPT:', err));
			}

			return reply.code(200).send(friendship);
		} catch (err) {
			return SharedErrors.handleError(err, reply);
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
			return SharedErrors.handleError(err, reply);
		}
	}

	// ============================================================================
	// DELETE FRIENDSHIP
	// ============================================================================
	async deleteFriendship(
		request: FastifyRequest,
		reply: FastifyReply
	): Promise <void> {
		try {
			const user = request.user as AuthTypes.AccessTokenPayload;

			if (!user.id) {
				reply.code(401).send({ error: 'Unauthorized', message: 'Usuario no autenticado'});
			}

			const { friendId } = request.params as FriendshipTypes.DeleteFriendshipParams;
			await this.friendshipService.deleteFriendship(user.id, friendId);

			// Notificar a ambos usuarios para actualizar lista de amigos
			this.publishFriendRemoved(user.id, friendId)
				.catch((err: Error) => console.error('[FriendshipController] Error publicando FRIEND_REMOVE:', err));

			return reply.code(204).send();
		} catch(err) {
			return SharedErrors.handleError(err, reply);
		}
	}
	
}

