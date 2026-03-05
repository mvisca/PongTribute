// Canal único Redis (Servicio a Servicio)
export const TRANSCENDENCE_CHANNEL = 'transcendence:events' as const;

export const TRANSCENDENCE_EVENTS = {
	// Los TIPOS DE EVENTOS (type del message Servicio a Servicio del canal Redis)
	// --User--
	USER_LOGIN: 'redis:user:login',
	USER_LOGOUT: 'redis:user:logout',
	USER_PROFILE_UPDATED: 'redis:user:profile_updated',
	USER_DISCONNECTED: 'redis:user:disconnected',

	// --Match (Game)--
	MATCH_FOUND: 'redis:match:found',
	MATCH_QUEUE_TIMEOUT: 'redis:match:queue_timeout',
	MATCH_INVITE: 'redis:match:invite',
	MATCH_STARTED: 'redis:match:started',
	MATCH_REJECTED: 'redis:match:rejected',
	MATCH_CANCELLED: 'redis:match:cancelled',
	MATCH_BOT_REQUESTED: 'redis:match:bot_requested',
	
	// --Friendship-- 
	FRIEND_REQUEST: 'redis:friend:request',
	FRIEND_ACCEPT: 'redis:friend:accept',
	FRIEND_REMOVE: 'redis:friend:remove'
} as const;
// Este 'as const' dice al compilador que este objeto es inmutable 
// y que infiera sus valores como "Literales de String" (ej. el 
// tipo de USER_LOGIN es exactamente el string 'redis:user:login', 
// no un string genérico).


// EVENTOS DE CLIENTE (Backend a Frontend vía WebSocket)
export const WEBSOCKET_EVENTS = {
	// --Game--
	GAME_UPDATE: 'game:update',
	GAME_OPPONENT_DISCONNECTED: 'game:opponent_disconnected', // Aviso específico: "Tu rival se ha ido, espera 15s"
	GAME_OPPONENT_RECONNECTED: 'game:opponent_reconnected',   // Aviso: "Tu Rival volvió"
	GAME_OVER: 'game:over',

	// --Presencia social--
	FRIEND_ONLINE: 'friend:online',
	FRIEND_OFFLINE: 'friend:offline',
	FRIEND_PROFILE_UPDATED: 'friend:profile_updated',

	// --Notificaciones de amistad--
	FRIEND_REQUEST: 'friend:request', 
	FRIEND_ACCEPT: 'friend:accept',
	FRIEND_REMOVE: 'friend:remove',

	// --Sala d espera / Notificaciones de partida--
	MATCH_JOINED: 'match:joined',
	MATCH_FOUND: 'match:found',
	MATCH_QUEUE_TIMEOUT: 'match:queue_timeout',
	MATCH_STARTED: 'match:started',
	MATCH_INVITE: 'match:invite',
	MATCH_CANCELLED: 'match:cancelled',
	MATCH_REJECTED: 'match:rejected'
} as const;


export type TranscendenceEvent = typeof TRANSCENDENCE_EVENTS[keyof typeof TRANSCENDENCE_EVENTS];
export type WebsocketEvent = typeof WEBSOCKET_EVENTS[keyof typeof WEBSOCKET_EVENTS];