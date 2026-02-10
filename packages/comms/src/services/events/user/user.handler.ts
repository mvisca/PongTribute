import { EventHandler, BaseEvent } from "../base.handler.js";
import { UserEvent, UserLoginEvent, UserLogoutEvent } from './user.events.js';
import { CommsService } from '../../comms.service.js';
import { CommsEnv } from '../../../config.js';
import { REDIS_CHANNELS } from '@transcendence/shared';

export class UserEventHandler implements EventHandler {
	channels = [
		REDIS_CHANNELS.USER_LOGIN,
		REDIS_CHANNELS.USER_LOGOUT	
	];

	async handle(event: BaseEvent, commsService: CommsService): Promise<void> {
		const userEvent = event as UserEvent;

		switch (userEvent.type) {
			case REDIS_CHANNELS.USER_LOGIN:
				await this.handleLogin(userEvent as UserLoginEvent, commsService);
				break;

			case REDIS_CHANNELS.USER_LOGOUT:
				await this.handleLogout(userEvent as UserLogoutEvent, commsService);
				break;
		}
	}

	private async handleLogin(
		event: UserLoginEvent,
		comms: CommsService
	): Promise<void> {
		console.log(`[UserHandler] ${event.targetUserId} online`)

		try {

			const friends = await this.getUserFriends(event.targetUserId);
			
			if (friends.length > 0) {
				comms.broadcastToUsers(friends, {
					type: REDIS_CHANNELS.FRIEND_ONLINE,
					payload: {
						userId: event.targetUserId,
						username: event.payload.username,
						avatar: event.payload.avatar,
						timestamp: event.timestamp
					}
				});
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
		comms: CommsService
	): Promise<void> {
		console.log(`[UserHandler] ${event.targetUserId} offline`);
		
		// Cerrar la conexion
		comms.closeUserConnection(event.targetUserId);

		try {
			// Todos los friends
			const friends = await this.getUserFriends(event.targetUserId);
			
			// Ha de haber más de cero
			if (friends.length > 0) {
				// Mensaje a todos
				comms.broadcastToUsers(friends, {
					type: REDIS_CHANNELS.FRIEND_OFFLINE,
					payload: {
						userId: event.targetUserId,
						username: event.payload.username,
						avatar: event.payload.avatar,
						isOnline: event.payload.isOnline,
						timestamp: event.timestamp
					}
				});
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