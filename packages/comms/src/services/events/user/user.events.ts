import { BaseEvent } from '../base.handler.js';

interface UserEventPayload {
	username: string;
	avatar: string;
	isOnline: boolean;
}

export interface UserLoginEvent extends BaseEvent {
	type: 'user:login';
	userId: string;
	payload: UserEventPayload;
}

export interface UserLogoutEvent extends BaseEvent {
	type: 'user:logout';
	userId: string;
	payload: UserEventPayload;
}

export type UserEvent = UserLoginEvent | UserLogoutEvent;