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
| TranscendenceEventsTypes.FriendRemovedEvent;

export class FriendshipEventHandler implements CommsEventHandler {
	private log: AppLogger = createLogger('FriendshipEventHandler');

	eventTypes = [
		TRANSCENDENCE_EVENTS.FRIEND_REQUEST,
		TRANSCENDENCE_EVENTS.FRIEND_ACCEPT,
		TRANSCENDENCE_EVENTS.FRIEND_REMOVE
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
			},
		};

		commsService.broadcastToUsers(
			[event.payload.removedId],
			wsMessage
		);
	}

}