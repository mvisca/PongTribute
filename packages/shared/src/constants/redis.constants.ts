export namespace redisConstants {
	
	export const REDIS_CHANNELS = {
		// User events
		USER_LOGIN: 'user:login',
		USER_LOGOUT: 'user:logout',
		
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
		
		// Generic events channel
		EVENTS: 'transcendence:events',
		USER_DISCONNECTED: 'user:disconnected',
		USER_PROFILE_UPDATED: 'user:profile_updated'
	} as const;
		
	export const REDIS_EVENTS = {
		USER_DISCONNECTED: 'user:disconnected' // El tipo de mensaje
	} as const;
}

export type RedisChannelType = typeof redisConstants.REDIS_CHANNELS[keyof typeof redisConstants.REDIS_CHANNELS];

