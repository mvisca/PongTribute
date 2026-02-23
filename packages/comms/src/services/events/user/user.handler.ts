import { CommsEventHandler } from "../base.handler.js";
import { 
	TRANSCENDENCE_EVENTS,
	WEBSOCKET_EVENTS,
	EventsTypes,
	TranscendenceEventsTypes,
	WebSocketEventsTypes } from '@transcendence/shared';
import { CommsService } from '../../comms.service.js';
import { CommsEnv } from '../../../config.js';

// Union type local para el handler
type UserEvent = TranscendenceEventsTypes.UserLoginEvent | TranscendenceEventsTypes.UserLogoutEvent;

export class UserEventHandler implements CommsEventHandler {

	eventTypes = [
		TRANSCENDENCE_EVENTS.USER_LOGIN,
		TRANSCENDENCE_EVENTS.USER_LOGOUT
	
	];

	async handle(
		event: EventsTypes.BaseEvent,
		commsService: CommsService
	): Promise<void> {
		const userEvent = event;

		switch (userEvent.type) {
			case TRANSCENDENCE_EVENTS.USER_LOGIN:
				await this.handleLogin(userEvent as TranscendenceEventsTypes.UserLoginEvent, commsService);
				break;

			case TRANSCENDENCE_EVENTS.USER_LOGOUT:
				await this.handleLogout(userEvent as TranscendenceEventsTypes.UserLogoutEvent, commsService);
				break;
		}
	}

	private async handleLogin(
		event: TranscendenceEventsTypes.UserLoginEvent,
		commsService: CommsService
	): Promise<void> {
		console.log(`[UserHandler] ${event.targetUserId} online`)

		try {
			// Todos los friends
			const friends = await this.getUserFriends(event.targetUserId);
			
			// Ha de haber más de cero
			if (friends.length > 0) {
				commsService.broadcastToUsers(friends, {
					type: WEBSOCKET_EVENTS.FRIEND_ONLINE,
					timestamp: event.timestamp,
					payload: {
						userId: event.payload.userId,
						username: event.payload.username,
						avatar: event.payload.avatar,
					},
				} satisfies WebSocketEventsTypes.FriendOnline
			);
				console.log(`[UserHandler] Notificado ${friends.length} amigos`);
			} else {
				console.log(`[UserHandler] Los amigos de ${event.payload.username} no están online`);
			}

		} catch (err) {
			console.error(`[UserHandler] Error en login:`, err);
		}
	}

	private async handleLogout(
		event: UserEvent,
		commsService: CommsService
	): Promise<void> {
		console.log(`[UserHandler] ${event.targetUserId} offline`);

		// Cerrar la conexion
		commsService.closeUserConnection(event.targetUserId);

		try {
			// Todos los friends
			const friends = await this.getUserFriends(event.targetUserId);

			// Ha de haber más de cero
			if (friends.length > 0) {
				// Mensaje a todos
				commsService.broadcastToUsers(friends, {
					type: WEBSOCKET_EVENTS.FRIEND_OFFLINE,
					timestamp: event.timestamp,
					payload: {
						userId: event.payload.userId,
						username: event.payload.username,
						avatar: event.payload.avatar,
					},
				} satisfies WebSocketEventsTypes.FriendOffline
			);
				console.log(`[UserHandler] Notificado ${friends.length} amigos`);
			} else {
				console.log(`[UserHandler] Los amigos de ${event.payload.username} no están online`);
			}

		} catch (err) {
			console.error(`[UserHandler] Error en logout:`, err);
		}
	}

	private async getUserFriends(userId: string): Promise<string[]> {
		try {
			const url = `${CommsEnv.USER_SERVICE_URL()}/internal/users/${userId}/friends`;
			const response = await fetch(url, {
				method: 'GET',
				headers: {
					'X-Service-Secret': CommsEnv.SERVICE_SECRET() || ''
				},
				signal: AbortSignal.timeout(5000)
			});

			if (!response.ok) {
				console.log(`[UserHandler] User service retornó ${response.status} para ${userId}`);
				return [];
			}

			const data = await response.json() as { friendsIds: string[] };
			return data.friendsIds || [];

		} catch (err) {
			console.error(`[UserHandler] Error obteniendo amigos:`, err);
			return [];
		}
	}
}