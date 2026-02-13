import { BaseEvent } from '../base.handler.js';
import { REDIS_CHANNELS } from '@transcendence/shared';

export type UserEvent = UserLoginEvent | UserLogoutEvent;

interface UserEventPayload {
	username: string;
	avatar: string;
	isOnline: boolean;
}

export interface UserLoginEvent extends BaseEvent {
	type: typeof REDIS_CHANNELS.USER_LOGIN;
	targetUserId: string;
	payload: UserEventPayload;
}

export interface UserLogoutEvent extends BaseEvent {
	type: typeof REDIS_CHANNELS.USER_LOGOUT;
	targetUserId: string;
	payload: UserEventPayload;
}

