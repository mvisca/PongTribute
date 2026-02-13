import { REDIS_CHANNELS } from '../constants/event.constants.js';

// 1. Interfaz Base para todos los eventos
export interface BaseEvent {
	type: string;
	timestamp: number;
	source?: string;  // Ej: 'auth-service'
}

// 2. Payloads Reutilizables
export interface UserInfoPayload {
	username: string;
	avatar: string;
	email: string;
	lastLogoutAt: number;
	isOnline: boolean;
	// TODO este payload para qué es? si es para JWT debería ser el mismo en todo el proyecto... si es para otra cosa, podría seguir siendo el mismo userPayload siempre?
}
// TODO Auditar toda la construccion de tipos y schemas e interfaces de eventos

//---------------------------------------------
// EVENTOS DE USER
//---------------------------------------------
// TODO quién consume estos interfaces definidos a continuación?

// LOGIN
export interface UserLoginEvent extends BaseEvent {
	type: typeof REDIS_CHANNELS.USER_LOGIN;
	targetUserId: string; // ID del usuario que hizo login
	source: string;
	timestamp: number;
	payload: UserInfoPayload;
}

// LOGOUT
export interface UserLogoutEvent extends BaseEvent {
	type: typeof REDIS_CHANNELS.USER_LOGOUT;
	targetUserId: string;
	payload: {
		username: string;
		email: string;
		avatar: string;
		lastLogoutAt: number;
		isOnline: boolean;
	};
}

// PROFILE UPDATED (Basado en las constants)
export interface UserProfileUpdatedEvent extends BaseEvent {
    type: typeof REDIS_CHANNELS.USER_PROFILE_UPDATED;
    targetUserId: string;
    payload: {
		updatedFields: string[]; // OJO con esto. REVISARLO CON MARTIN
		username?: string;
		avatar?: string;
    };
}

// USER DISCONNECTED
export interface UserDisconnectedEvent extends BaseEvent {
    type: typeof REDIS_CHANNELS.USER_DISCONNECTED;
    targetUserId: string;
    payload: {
        userId: string;
    };
}

// ---------------------------------------------
// EVENTOS DE MATCH (Match Events) servicio game
// ---------------------------------------------

// MATCH_FOUND
export interface MatchFoundEvent extends BaseEvent {
	type: typeof REDIS_CHANNELS.MATCH_FOUND; // Asegúrate de haber añadido esta constante en event.constants.ts
	payload: {
		matchId: string;     // ID único del emparejamiento
		playerIds: string[]; // IDs de los usuarios emparejados
		roomId: string;      // Sala de juego asignada
	};
}

// MATCH_QUEUE_TIMEOUT
export interface MatchQueueTimeoutEvent extends BaseEvent {
	type: typeof REDIS_CHANNELS.MATCH_QUEUE_TIMEOUT;
	payload: {
		userId: string;
		reason: string;
	};
}


// MATCH_INVITE (privada)
export interface MatchInviteEvent extends BaseEvent {
	type: typeof REDIS_CHANNELS.MATCH_INVITE;
	payload: {
		matchId: string;
		inviterId: string;   // Quién invita
		inviteeId: string;   // A quién invita
		gameMode: string;
	};
}

// MATCH_STARTED
// Partida Iniciada (Similar a MatchFound pero para privadas/generico)
export interface MatchStartedEvent extends BaseEvent {
	type: typeof REDIS_CHANNELS.MATCH_STARTED;
	payload: {
		matchId: string;
		playerIds: string[];
		//roomId: string;  CREO NO HACE FALTA
	};
}

// MATCH_REJECTED
export interface MatchRejectedEvent extends BaseEvent {
	type: typeof REDIS_CHANNELS.MATCH_REJECTED;
	payload: {
		matchId: string;
		userId: string; // Quién rechazó
	};
}

// MATCH_CANCELLED
export interface MatchCancelledEvent extends BaseEvent {
	type: typeof REDIS_CHANNELS.MATCH_CANCELLED;
	payload: {
		matchId: string;
		targetUserId: string;
		reason?: string;
	};
}


// ---------------------------------------------
// UNION TYPE FINAL
// ---------------------------------------------
// Registro de eventos para que el sistema los reconozca.
// Al añadirlo al Unión, cuando hagas un switch (event.type) en
//  el Frontend o en otro servicio, TypeScript sabrá automáticamente
//  que si el tipo es GAME_START, entonces seguro tienes acceso a payload.gameId.
export type SystemEvent =
	// User
	| UserLoginEvent
	| UserLogoutEvent
	| UserProfileUpdatedEvent
	| UserDisconnectedEvent
	// Match
	| MatchFoundEvent
	| MatchQueueTimeoutEvent
	| MatchInviteEvent
	| MatchStartedEvent
	| MatchRejectedEvent
	| MatchCancelledEvent;

	


/*
ESTOS YA NO SON EVENTOS REDIS SINO DE SOCKET
// ---------------------------------------------
// EVENTOS DE JUEGO (Game Events)
// ---------------------------------------------

// GAME_START
// Crea un "contrato". Cualquier objeto que sea un evento de 
// inicio de juego debe tener timestamp (heredado de Base) y 
// la estructura que definimos aquí.
export interface GameStartEvent extends BaseEvent {
	//Esto es MÁGICO en TypeScript. No permite cualquier string. 
	// Obliga a que el campo type sea exactamente 'game:start'.
	type: typeof REDIS_CHANNELS.GAME_START; // Vincula con la constante
	// Define estrictamente qué datos viajan por Redis. 
	// Si intentas enviar un evento de inicio sin gameId, 
	// TypeScript te gritará (previene bugs).
    payload: {
        gameId: string;
        playerIds: string[]; // IDs de los jugadores
        config?: any;        // Configuración de la partida
    };
}

// GAME_END
export interface GameEndEvent extends BaseEvent {
    type: typeof REDIS_CHANNELS.GAME_END;
    payload: {
        gameId: string;
        winnerId: string;
		// score: { [playerId: string]: number }; // Ej: { "user1": 10, "user2": 5 }
		scores: Record<string, number>; // objeto donde las claves son strings (user IDs) y los valores son números (puntos)
    };
}
*/











