import { BaseEvent } from '../base.handler.js';
import { REDIS_CHANNELS } from '@transcendence/shared';

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
