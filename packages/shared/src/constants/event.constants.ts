 
export const REDIS_CHANNELS = {
		
		// Global events
		EVENTS: 'transcendence:events',

		// User events
		USER_LOGIN: 'user:login',
		USER_LOGOUT: 'user:logout',
		USER_PROFILE_UPDATED: 'user:profile_updated',
		USER_DISCONNECTED: 'user:disconnected',

		// Match (Game) events

		
		// Game events
		GAME_START: 'game:start',
		GAME_END: 'game:end',
		GAME_UPDATE: 'game:update',
		
		// Friendship events
		FRIEND_REQUEST: 'friend:request',
		FRIEND_ACCEPT: 'friend:accept',
		FRIEND_REMOVE: 'friend:remove',
		FRIEND_ONLINE: 'friend:online',
		FRIEND_OFFLINE: 'friend:offline',
		
	} as const;

export type RedisChannelType = typeof REDIS_CHANNELS[keyof typeof REDIS_CHANNELS];

