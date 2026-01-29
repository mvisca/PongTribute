export namespace redisConstants {


	export const REDIS_CHANNELS = {
		EVENTS: 'transcendence:events' // Canal global de eventos
	} as const;


	export const REDIS_EVENTS = {
		USER_DISCONNECTED: 'user:disconnected',
		USER_PROFILE_UPDATED: 'user:profile_updated'
	} as const;


}