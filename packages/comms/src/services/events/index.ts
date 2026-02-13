import { EventHandler } from './base.handler.js';
import { UserEventHandler } from './user/user.handler.js';
import { GameEventHandler } from './game/game.handler.js';
// import { FriendshipEventHandler } from './friendship/friendship.handler.js';

export const EVENT_HANDLERS: EventHandler[] = [
	new UserEventHandler(),
	new GameEventHandler(),
	// new FriendshipEventHandler(), // TODO: Habilitar cuando se implemente
];