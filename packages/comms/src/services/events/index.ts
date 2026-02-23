import { CommsEventHandler } from './base.handler.js';
import { UserEventHandler } from './user/user.handler.js';
import { FriendshipEventHandler } from './friendship/friendship.handler.js';
import { GameEventHandler } from './game/game.handler.js';

export const EVENT_HANDLERS: CommsEventHandler[] = [
	new UserEventHandler(),
	new FriendshipEventHandler(),
	new GameEventHandler()
];