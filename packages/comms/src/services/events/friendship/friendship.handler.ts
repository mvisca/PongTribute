import { CommsEventHandler } from '../base.handler.js';
import { CommsService } from '../../comms.service.js';
import {
	TRANSCENDENCE_EVENTS,
	WEBSOCKET_EVENTS,
	EventsTypes,
	TranscendenceEventsTypes,
	WebSocketEventsTypes
} from '@transcendence/shared';
import { createLogger, type AppLogger } from '@transcendence/shared';

type FriendshipEvent =
	| TranscendenceEventsTypes.FriendRequestEvent
	| TranscendenceEventsTypes.FriendAcceptedEvent
	| TranscendenceEventsTypes.FriendRemovedEvent
	| TranscendenceEventsTypes.FriendRequestCancelledEvent
	| TranscendenceEventsTypes.FriendRequestDeclinedEvent;

export class FriendshipEventHandler implements CommsEventHandler {
	private log: AppLogger = createLogger('FriendshipEventHandler');

	eventTypes = [
		TRANSCENDENCE_EVENTS.FRIEND_REQUEST,
		TRANSCENDENCE_EVENTS.FRIEND_ACCEPT,
		TRANSCENDENCE_EVENTS.FRIEND_REMOVE,
		TRANSCENDENCE_EVENTS.FRIEND_REQUEST_CANCEL,
		TRANSCENDENCE_EVENTS.FRIEND_REQUEST_DECLINED
	];
	
	async handle(
		event: EventsTypes.BaseEvent,
		commsService: CommsService
	): Promise<void> {
		const friendshipEvent = event as FriendshipEvent;
		
		switch (friendshipEvent.type) { 
			case TRANSCENDENCE_EVENTS.FRIEND_REQUEST:
				await this.handleFriendRequest(
					friendshipEvent as TranscendenceEventsTypes.FriendRequestEvent,
					commsService
				);
				break;
			
			case TRANSCENDENCE_EVENTS.FRIEND_ACCEPT:
				await this.handleFriendAccept(
					friendshipEvent as TranscendenceEventsTypes.FriendAcceptedEvent,
					commsService
				);
				break;
			
			case TRANSCENDENCE_EVENTS.FRIEND_REMOVE:
				await this.handleFriendRemove(
					friendshipEvent as TranscendenceEventsTypes.FriendRemovedEvent,
					commsService
				);
				break;
			
			case TRANSCENDENCE_EVENTS.FRIEND_REQUEST_CANCEL:
				await this.handleFriendRequestCancel(
					friendshipEvent as TranscendenceEventsTypes.FriendRequestCancelledEvent,
					commsService
				);
				break;
			
			case TRANSCENDENCE_EVENTS.FRIEND_REQUEST_DECLINED:
				await this.handleFriendRequestDeclined(
					friendshipEvent as TranscendenceEventsTypes.FriendRequestDeclinedEvent,
					commsService
				);
				break;
		}
	}
	
	private async handleFriendRequest(
		event: TranscendenceEventsTypes.FriendRequestEvent,
		commsService: CommsService
	): Promise<void> {
		this.log.info({ senderId: event.payload.senderId, receiverId: event.payload.receiverId }, 'Friend request');
		const wsMessage: WebSocketEventsTypes.FriendRequest = {
			type: WEBSOCKET_EVENTS.FRIEND_REQUEST,
			timestamp: event.timestamp,
			payload: {
				senderId: event.payload.senderId,
				senderUsername: event.payload.senderUsername,
				senderAvatar: event.payload.senderAvatar,
			},
		};

		// Notificar solo al receptor
		commsService.broadcastToUsers([event.payload.receiverId], wsMessage);
	}

	private async handleFriendAccept(
		event: TranscendenceEventsTypes.FriendAcceptedEvent,
		commsService: CommsService
	): Promise<void> {
		this.log.info({ acceptorId: event.payload.acceptorId, requesterId: event.payload.requesterId }, 'Friend accepted');

		const wsMessage: WebSocketEventsTypes.FriendAccepted = {
			type: WEBSOCKET_EVENTS.FRIEND_ACCEPT,
			timestamp: event.timestamp,
			payload: {
				acceptorId: event.payload.acceptorId,
				acceptorUsername: event.payload.acceptorUsername,
				acceptorAvatar: event.payload.acceptorAvatar,
				requesterId: event.payload.requesterId
			}
		};

		commsService.broadcastToUsers([
			event.payload.requesterId,
			event.payload.acceptorId
		], wsMessage);
	}

	private async handleFriendRemove(
		event: TranscendenceEventsTypes.FriendRemovedEvent,
		commsService: CommsService
	): Promise<void> {
		this.log.info({ removerId: event.payload.removerId, removedId: event.payload.removedId }, 'Friend removed');
		const wsMessage: WebSocketEventsTypes.FriendRemoved = {
			type: WEBSOCKET_EVENTS.FRIEND_REMOVE,
			timestamp: event.timestamp,
			payload: {
				removerId: event.payload.removerId,
				removedId: event.payload.removedId,
				removerUsername: event.payload.removerUsername
			},
		};

		commsService.broadcastToUsers(
			[event.payload.removedId],
			wsMessage
		);
	}

	private async handleFriendRequestCancel(
		event: TranscendenceEventsTypes.FriendRequestCancelledEvent,
		commsService: CommsService
	): Promise<void> {
		this.log.info({ cancellerId: event.payload.cancellerId, receiverId: event.payload.receiverId }, 'Friend request cancelled');
		const wsMessage: WebSocketEventsTypes.FriendRequestCancelled = {
			type: WEBSOCKET_EVENTS.FRIEND_REQUEST_CANCEL,
			timestamp: event.timestamp,
			payload: {
				cancellerId: event.payload.cancellerId,
			},
		};

		// Notificar solo al receptor
		commsService.broadcastToUsers([event.payload.receiverId], wsMessage);
	}

	private async handleFriendRequestDeclined(
		event: TranscendenceEventsTypes.FriendRequestDeclinedEvent,
		commsService: CommsService
	): Promise<void> {
		this.log.info({ declinerId: event.payload.declinerId, initiatorId: event.payload.initiatorId }, 'Friend request declined');
		const wsMessage: WebSocketEventsTypes.FriendRequestDeclined = {
			type: WEBSOCKET_EVENTS.FRIEND_REQUEST_DECLINED,
			timestamp: event.timestamp,
			payload: {
				declinerId: event.payload.declinerId,
			},
		};

		// Notificar solo al invitador original
		commsService.broadcastToUsers([event.payload.initiatorId], wsMessage);
	}

}