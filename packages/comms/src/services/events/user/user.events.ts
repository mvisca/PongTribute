import { BaseEvent } from '../base.handler.js';
import { REDIS_CHANNELS } from '@transcendence/shared';

interface UserEventPayload {
	username: string;
	avatar: string;
	isOnline: boolean;
}

export interface UserLoginEvent extends BaseEvent {
	type: typeof REDIS_CHANNELS.USER_LOGIN;
	userId: string;
	payload: UserEventPayload;
}

export interface UserLogoutEvent extends BaseEvent {
	type: typeof REDIS_CHANNELS.USER_LOGOUT;
	userId: string;
	payload: UserEventPayload;
}

export type UserEvent = UserLoginEvent | UserLogoutEvent;