import { CommsEventHandler } from "../base.handler.js";
import { 
    TRANSCENDENCE_EVENTS,
    WEBSOCKET_EVENTS,
    EventsTypes,
    TranscendenceEventsTypes,
    WebSocketEventsTypes } from '@transcendence/shared';
import { CommsService } from '../../comms.service.js';


type UserEvent = TranscendenceEventsTypes.UserLoginEvent | TranscendenceEventsTypes.UserLogoutEvent;

export class UserEventHandler implements CommsEventHandler {

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
		// DEBUG
		console.log(`[UserHandler-DEBUG] login event payload:`, JSON.stringify(event.payload));
        console.log(`[UserHandler] ${event.targetUserId} online`);

        const friends = event.payload.friendsIds ?? [];

		// DEBUG
		console.log(`[UserHandler-DEBUG] friends:`, friends);
		const sent = commsService.sendToUser(friends[0], { type: 'debug-test' } as any);
		console.log(`[UserHandler-DEBUG] sendToUser result:`, sent);

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
            console.log(`[UserHandler] Notificado ${friends.length} amigos`);
        } else {
            console.log(`[UserHandler] ${event.payload.username} no tiene amigos online`);
        }
    }

    private async handleLogout(
        event: UserEvent,
        commsService: CommsService
    ): Promise<void> {
        console.log(`[UserHandler] ${event.targetUserId} offline`);

		console.log(`[UserHandler-DEBUG] logout event payload:`, JSON.stringify(event.payload));

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
            console.log(`[UserHandler] Notificado ${friends.length} amigos`);
        } else {
            console.log(`[UserHandler] ${event.payload.username} no tiene amigos online`);
        }
    }

    private async handleProfileUpdated(
        event: TranscendenceEventsTypes.UserProfileUpdatedEvent,
        commsService: CommsService
    ): Promise<void> {
        console.log(`[UserHandler] ${event.targetUserId} profile updated`);

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
            console.log(`[UserHandler] Notificado cambio de perfil a ${friends.length} amigos`);
        }
    }
}