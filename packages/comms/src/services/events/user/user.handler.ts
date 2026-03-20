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
        this.log.info({ userId: event.targetUserId }, 'User online event received');
		// Now social presence is handled by CommsService.handleConnection() when user's ws connects
    }

    private async handleLogout(
        event: UserEvent,
        commsService: CommsService
    ): Promise<void> {
        this.log.info({ userId: event.targetUserId }, 'User offline event received');
		// Close all ws connections for this user
		// THis triggers handleDisconnect, sockets.size === 0, ofline presence notification
		commsService.closeUserConnection(event.targetUserId);
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