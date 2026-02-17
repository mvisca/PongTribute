 // EVENTOS INTERNOS (Backend a Backend vía Redis)
export const TRANSCENDENCE_EVENTS = {
		
	// Es el CANAL ÚNICO. Todos publican y escuchan aquí
	EVENTS: 'transcendence:events',

	// Los TIPOS DE EVENTOS
	// User
	USER_LOGIN: 'user:login',
	USER_LOGOUT: 'user:logout',
	USER_PROFILE_UPDATED: 'user:profile_updated',
	USER_DISCONNECTED: 'user:disconnected',
	// Match (Game)
	MATCH_FOUND: 'match:found',
	MATCH_QUEUE_TIMEOUT: 'match.queue_timeout',
	MATCH_INVITE: 'match.invite',
	MATCH_STARTED: 'match.started',
	MATCH_REJECTED: 'match.rejected',
	MATCH_CANCELLED: 'match.cancelled',	
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

	//Sala de espera
	JOINED_MATCH: 'match:joined',
	// Game
	GAME_START: 'game:start',
	GAME_OVER: 'game:over',
	GAME_UPDATE: 'game:update',
	// Game reconection
	GAME_PAUSED: 'game:paused',                     // El juego se detiene (ej: usuario minimiza o desconexión)
	GAME_RESUMED: 'game:resumed',                   // El juego continua
	GAME_OPPONENT_DISCONNECTED: 'game:opponent_disconnected', // Aviso específico: "Tu rival se ha ido, espera 15s"
	GAME_OPPONENT_RECONNECTED: 'game:opponent_reconnected',   // Aviso: "Tu Rival volvió"
	// Presencia social
	FRIEND_ONLINE: 'friend:online',
	FRIEND_OFFLINE: 'friend:offline',
	// Notificaciones de amistad
	FRIEND_REQUEST: 'friend:request', 
	FRIEND_ACCEPT: 'friend:accept',
	FRIEND_REMOVE: 'friend:remove',
	// Notificaciones de partida
	MATCH_INVITE: 'match:invite',
	MATCH_CANCELLED: 'match:cancelled',
	MATCH_REJECTED: 'match:rejected'
} as const;

export type TranscendenceEvent = typeof TRANSCENDENCE_EVENTS[keyof typeof TRANSCENDENCE_EVENTS];
export type WebsocketEvent = typeof WEBSOCKET_EVENTS[keyof typeof WEBSOCKET_EVENTS];