import { CommsEventHandler } from "../base.handler.js";
import { 
    TRANSCENDENCE_EVENTS,
    WEBSOCKET_EVENTS,
    EventsTypes,
    TranscendenceEventsTypes,
	WebSocketEventsTypes
} from '@transcendence/shared';
	import { createLogger, type AppLogger } from '@transcendence/shared';
import { CommsService } from '../../comms.service.js';


type UserEvent = TranscendenceEventsTypes.UserLoginEvent | TranscendenceEventsTypes.UserLogoutEvent;

export class UserEventHandler implements CommsEventHandler {

	private log: AppLogger = createLogger('UserEventHandler');

    eventTypes = [
        TRANSCENDENCE_EVENTS.USER_LOGIN,
        TRANSCENDENCE_EVENTS.USER_LOGOUT,
        TRANSCENDENCE_EVENTS.USER_PROFILE_UPDATED
    ];

    async handle(
        event: EventsTypes.BaseEvent,
        commsService: CommsService
    ): Promise<void> {
        switch (event.type) {
            case TRANSCENDENCE_EVENTS.USER_LOGIN:
                await this.handleLogin(event as TranscendenceEventsTypes.UserLoginEvent, commsService);
                break;
            case TRANSCENDENCE_EVENTS.USER_LOGOUT:
                await this.handleLogout(event as TranscendenceEventsTypes.UserLogoutEvent, commsService);
                break;
            case TRANSCENDENCE_EVENTS.USER_PROFILE_UPDATED:
                await this.handleProfileUpdated(event as TranscendenceEventsTypes.UserProfileUpdatedEvent, commsService);
                break;
        }
    }

    private async handleLogin(
        event: TranscendenceEventsTypes.UserLoginEvent,
        commsService: CommsService
    ): Promise<void> {
        this.log.info({ userId: event.targetUserId }, 'User online');

        const friends = event.payload.friendsIds ?? [];

		// DEBUG
		const sent = commsService.sendToUser(friends[0], { type: 'debug-test' } as any);

        if (friends.length > 0) {
            commsService.broadcastToUsers(friends, {
                type: WEBSOCKET_EVENTS.FRIEND_ONLINE,
                timestamp: event.timestamp,
                payload: {
                    userId: event.payload.userId,
                    username: event.payload.username,
                    avatar: event.payload.avatar,
                },
            } satisfies WebSocketEventsTypes.FriendOnline);
            this.log.info({ count: friends.length }, 'Friends notified - online');
        } else {
            this.log.debug({ username: event.payload.username }, 'No friends to notify');
        }
    }

    private async handleLogout(
        event: UserEvent,
        commsService: CommsService
    ): Promise<void> {
        this.log.info({ userId: event.targetUserId }, 'User offline');

        commsService.closeUserConnection(event.targetUserId);

        const friends = event.payload.friendsIds ?? [];

        if (friends.length > 0) {
            commsService.broadcastToUsers(friends, {
                type: WEBSOCKET_EVENTS.FRIEND_OFFLINE,
                timestamp: event.timestamp,
                payload: {
                    userId: event.payload.userId,
                    username: event.payload.username,
                    avatar: event.payload.avatar,
                },
            } satisfies WebSocketEventsTypes.FriendOffline);
            this.log.info({ count: friends.length }, 'Friends notified - offline');
        } else {
            this.log.debug({ username: event.payload.username }, 'No friends to notify');
        }
    }

    private async handleProfileUpdated(
        event: TranscendenceEventsTypes.UserProfileUpdatedEvent,
        commsService: CommsService
    ): Promise<void> {
        this.log.info({ userId: event.targetUserId }, 'Profile updated');

        const friends = event.payload.friendsIds ?? [];

        if (friends.length > 0) {
            commsService.broadcastToUsers(friends, {
                type: WEBSOCKET_EVENTS.FRIEND_PROFILE_UPDATED,
                timestamp: event.timestamp,
                payload: {
                    userId: event.payload.userId,
                    username: event.payload.username,
                    avatar: event.payload.avatar,
                },
            } satisfies WebSocketEventsTypes.FriendProfileUpdated);
            this.log.info({ count: friends.length }, 'Friends notified - profile updated');
        }
    }
}