import { EventHandler, BaseEvent } from "../base.handler.js";
import { UserEvent, UserLoginEvent, UserLogoutEvent } from './user.events.js';
import { CommsService } from '../../comms.service.js';
import { CommsEnv } from "src/config.js";

export class UserEventHandler implements EventHandler {
	channels = ['user:login', 'user:logout'];

	async handle(event: BaseEvent, commsService: CommsService): Promise<void> {
		const userEvent = event as UserEvent;

		switch (userEvent.type) {
			case 'user:login':
				await this.handleLogin(userEvent as UserLoginEvent, commsService);
				break;

			case 'user:logout':
				await this.handleLogout(userEvent as UserLogoutEvent, commsService);
				break;
		}
	}

	private async handleLogin(
		event: UserLoginEvent,
		comms: CommsService
	): Promise<void> {
		console.log(`[UserHandler] ${event.userId} online`)

		try {

			const friends = await this.getUserFriends(event.userId);
			
			if (friends.length > 0) {
				comms.broadcastToUsers(friends, {
					type: 'friend:online',
					payload: {
						userId: event.userId,
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
		console.log(`[UserHandler] ${event.userId} offline`);

		try {
			const friends = await this.getUserFriends(event.userId);
			
			if (friends.length > 0) {

				comms.broadcastToUsers(friends, {
					type: 'friend:offline',
					payload: {
						userId: event.userId,
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