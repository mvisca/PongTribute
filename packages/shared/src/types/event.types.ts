import { REDIS_CHANNELS } from '../constants/event.constants.js';
import { GameMode } from '../schemas/match.schema.js';
import type { GameState } from './game.types.js';

// 1. Interfaz Base para todos los eventos
export interface BaseEvent {
	type: string;		// Qué publica
	timestamp: number;	// Cuándo publica
	source?: string;	// Quién publica
}

// 2. Payloads Reutilizables
export interface UserInfoPayload {
	username: string;
	avatar: string;
	email: string;
	lastLogoutAt: number;
	isOnline: boolean;
}

//---------------------------------------------
// EVENTOS DE USER
//---------------------------------------------

// LOGIN
export interface UserLoginEvent extends BaseEvent {
	type: typeof REDIS_CHANNELS.USER_LOGIN;
	targetUserId: string; // ID del usuario que hizo login
	payload: UserInfoPayload;
}

// LOGOUT
export interface UserLogoutEvent extends BaseEvent {
	type: typeof REDIS_CHANNELS.USER_LOGOUT;
	targetUserId: string; // ID del usuario que hizo logout
	payload: UserInfoPayload;
}

// PROFILE UPDATED (Basado en las constants)
export interface UserProfileUpdatedEvent extends BaseEvent {
    type: typeof REDIS_CHANNELS.USER_PROFILE_UPDATED;
    targetUserId: string;
    payload: UserInfoPayload;
}

// USER DISCONNECTED
export interface UserDisconnectedEvent extends BaseEvent {
    type: typeof REDIS_CHANNELS.USER_DISCONNECTED;
    targetUserId: string;
    payload: UserInfoPayload;
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
		gameMode: GameMode;
	};
}

// MATCH_STARTED
// Partida Iniciada (Similar a MatchFound pero para privadas/generico)
export interface MatchStartedEvent extends BaseEvent {
	type: typeof REDIS_CHANNELS.MATCH_STARTED;
	payload: {
		matchId: string;
		playerIds: string[];
		roomId?: string; // Opcional - puede no ser necesario
	};
}

// MATCH_REJECTED
export interface MatchRejectedEvent extends BaseEvent {
	type: typeof REDIS_CHANNELS.MATCH_REJECTED;
	payload: {
		matchId: string;
		rejectorId: string;  // Usuario que rechazó la invitación
		inviterId: string;   // Usuario que creó la invitación (para notificarle)
	};
}

// MATCH_CANCELLED
export interface MatchCancelledEvent extends BaseEvent {
	type: typeof REDIS_CHANNELS.MATCH_CANCELLED;
	payload: {
		matchId: string;
		cancelledById: string;   // Usuario que canceló la partida
		notifiedUserId: string;  // Usuario a quien notificar la cancelación
		reason?: string;
	};
}


//---------------------------------------------
// EVENTOS DE GAME
//---------------------------------------------

/**
 * Payload completo para GameUpdateEvent.
 * Incluye toda la información necesaria para que consumidores (comms, frontend)
 * puedan actualizar su estado sin hacer requests adicionales a la base de datos.
 */
export interface GameUpdatePayload {
	// Match info completo (de BD) para evitar requests adicionales
	match: {
		id: string;
		status: 'pending' | 'active' | 'finished' | 'rejected' | 'expired';
		player1: {
			userId: string;
			username: string;
			score: number;
			isWinner: boolean;
		};
		player2: {
			userId: string;
			username: string;
			score: number;
			isWinner: boolean;
		};
		winnerId: string | null;
		gameMode: GameMode;
		targetScore: number;
		createdAt: string;
		finishedAt?: string;
	};
	// Estado en tiempo real del juego (posiciones, velocidades, scores)
	gameState: GameState;
	// Discriminador para que handlers actúen según el tipo de cambio
	updateType: 'state_change' | 'score_update' | 'game_finished' | 'game_paused' | 'game_resumed';
	// Timestamp del update
	timestamp: number;
}

export interface GameUpdateEvent extends BaseEvent {
	type: typeof REDIS_CHANNELS.GAME_UPDATE;
	matchId: string;
	payload: GameUpdatePayload;
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
	| MatchCancelledEvent
	// Game
	| GameUpdateEvent;

	


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











