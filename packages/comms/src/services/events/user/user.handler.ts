import { EventHandler, BaseEvent } from "../base.handler.js";
import { UserEvent } from './user.events.js';
import { CommsService } from '../../comms.service.js';
import { timeStamp } from "console";

export class UserEventHandler implements EventHandler {
	channels = ['user:login', 'user:logout'];

	async handle(event: BaseEvent, commsService: CommsService): Promise<void> {
		const userEvent = event as UserEvent;

		switch (userEvent.type) {
			case 'user:login':
				await this.handleLogin(userEvent, commsService);
				break;
			case 'user:logout':
				await this.handleLogout(userEvent, commsService);
				break;
		}
	}

	private async handleLogin(event: UserEvent, comms: CommsService) {
		const friends = await comms.getUserFriends(event.userId);

		for (const friendId of friends) {
			comms.sendToUser(friendId, {
				type: 'friend_online',
				payload: {
					userId: event.userId,
					username: event.payload.username,
					avatar: event.payload.avatar,
					isOnline: event.payload.isOnline,
					timestamp: event.timestamp
				}
			});
		}
	}

	private async handleLogout(event: UserEvent, comms: CommsService) {
		const friends = await comms.getUserFriends(event.userId);

		for (const friendId of friends) {
			comms.sendToUser(friendId, {
				type: 'friend_offline',
				payload: {
					userId: event.userId,
					username: event.payload.username,
					avatar: event.payload.avatar,
					isOnline: event.payload.isOnline,
					timestamp: event.timestamp
				}
			});
		}
	}

}