// Canal único Redis (Servicio a Servicio)
export const REDIS_CHANNEL = 'transcendence:events' as const;

export const TRANSCENDENCE_EVENTS = {
	// Los TIPOS DE EVENTOS (type del message Servicio a Servicio del canal Redis)
	// User
	USER_LOGIN: 'user:login',
	USER_LOGOUT: 'user:logout',
	USER_PROFILE_UPDATED: 'user:profile_updated',
	USER_DISCONNECTED: 'user:disconnected',
	// Match (Game)
	MATCH_FOUND: 'match:found',
	MATCH_QUEUE_TIMEOUT: 'match:queue_timeout',
	MATCH_INVITE: 'match:invite',
	MATCH_STARTED: 'match:started',
	MATCH_REJECTED: 'match:rejected',
	MATCH_CANCELLED: 'match:cancelled',	
	// Friendship 
	FRIEND_REQUEST: 'friend:request',
	FRIEND_ACCEPT: 'friend:accept',
	FRIEND_REMOVE: 'friend:remove',
	FRIEND_ONLINE: 'friend:online',
	FRIEND_OFFLINE: 'friend:offline',
	// Game
	GAME_UPDATE: 'game:update'

} as const;

// EVENTOS DE CLIENTE (Backend a Frontend vía WebSocket)
export const WEBSOCKET_EVENTS = {

	// Game
	GAME_UPDATE: 'game:update',
	GAME_OPPONENT_DISCONNECTED: 'game:opponent_disconnected', // Aviso específico: "Tu rival se ha ido, espera 15s"
	GAME_OPPONENT_RECONNECTED: 'game:opponent_reconnected',   // Aviso: "Tu Rival volvió"
	GAME_OVER: 'game:over',
	// Presencia social
	FRIEND_ONLINE: 'friend:online',
	FRIEND_OFFLINE: 'friend:offline',
	// Notificaciones de amistad
	FRIEND_REQUEST: 'friend:request', 
	FRIEND_ACCEPT: 'friend:accept',
	FRIEND_REMOVE: 'friend:remove',
	//Sala de espera
	MATCH_JOINED: 'match:joined',
	// Notificaciones de partida
	MATCH_INVITE: 'match:invite',
	MATCH_CANCELLED: 'match:cancelled',
	MATCH_REJECTED: 'match:rejected'
} as const;


export type TranscendenceEvent = typeof TRANSCENDENCE_EVENTS[keyof typeof TRANSCENDENCE_EVENTS];
export type WebsocketEvent = typeof WEBSOCKET_EVENTS[keyof typeof WEBSOCKET_EVENTS];