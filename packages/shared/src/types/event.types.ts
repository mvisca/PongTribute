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
	avatar?: string;
	email?: string;
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
	targetUserId: string;
	payload: {
		lastLogoutAt: number;
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
	// Game
    //| GameStartEvent 
    //| GameEndEvent;








// import { BaseEvent } from "./index.js";
// import { UserTypes } from "../index.js";

// export namespace UserEvent {
// 	/**
// 	* Evento: Usuario registrado exitosamente
// 	*/
// 	class Registered extends BaseEvent {
// 		constructor(public readonly user: UserTypes.UserPublic) {
// 			super('user.registered', 'auth-service');
// 		}
		
// 		toJSON(): object {
// 			return {
// 				id: this.id,
// 				eventType: this.eventType,
// 				timestamp: this.timestamp,
// 				user: this.user
// 			};
// 		}
// 	}
	
// 	/**
// 	* Evento: Usuario inició sesión
// 	*/
// 	class LoggedIn extends BaseEvent {
// 		constructor(
// 			public readonly userId: string,
// 			public readonly alias: string
// 		) {
// 			super('user.logged_in', 'auth-service');
// 		}
		
// 		toJSON(): object {
// 			return {
// 				id: this.id,
// 				eventType: this.eventType,
// 				timestamp: this.timestamp,
// 				userId: this.userId,
// 				alias: this.alias
// 			};
// 		}
// 	}
	
// 	/**
// 	* Evento: Usuario cerró sesión
// 	*/
// 	class LoggedOut extends BaseEvent {
// 		constructor(public readonly userId: string) {
// 			super('user.logged_out', 'auth-service');
// 		}
		
// 		toJSON(): object {
// 			return {
// 				id: this.id,
// 				eventType: this.eventType,
// 				timestamp: this.timestamp,
// 				userId: this.userId
// 			};
// 		}
// 	}
	
// 	/**
// 	* Evento: Perfil de usuario actualizado
// 	*/
// 	class ProfileUpdated extends BaseEvent {
// 		constructor(
// 			public readonly userId: string,
// 			public readonly updatedFields: string[]
// 		) {
// 			super('user.profile_updated', 'user-service');
// 		}
		
// 		toJSON(): object {
// 			return {
// 				id: this.id,
// 				eventType: this.eventType,
// 				timestamp: this.timestamp,
// 				userId: this.userId,
// 				updatedFields: this.updatedFields
// 			};
// 		}
// 	}
	
// 	/**
// 	* Evento: Usuario cambió estado online/offline
// 	*/
// 	class StatusChanged extends BaseEvent {
// 		constructor(
// 			public readonly userId: string,
// 			public readonly isOnline: boolean
// 		) {
// 			super('user.status_changed', 'user-service');
// 		}
		
// 		toJSON(): object {
// 			return {
// 				id: this.id,
// 				eventType: this.eventType,
// 				timestamp: this.timestamp,
// 				userId: this.userId,
// 				isOnline: this.isOnline
// 			};
// 		}
// 	}
	
// 	/**
// 	* Evento: Usuario eliminado
// 	*/
// 	class Deleted extends BaseEvent {
// 		constructor(public readonly userId: string) {
// 			super('user.deleted', 'user-service');
// 		}
		
// 		toJSON(): object {
// 			return {
// 				id: this.id,
// 				eventType: this.eventType,
// 				timestamp: this.timestamp,
// 				userId: this.userId
// 			};
// 		}
// 	}
// }



// import { Utils } from "../index.js";

// export abstract class BaseEvent {
// 	public readonly id: string;
// 	public readonly eventType: string;
// 	public readonly timestamp: number;
// 	public readonly version: number;
// 	public readonly source: string;
	
// 	constructor(eventType: string, source: string) {
// 		this.id = Utils.generateEventId();
// 		this.eventType = eventType;
// 		this.timestamp = Date.now();
// 		this.version = 1;
// 		this.source = source;
// 	}
	
// 	abstract toJSON(): object;
	
// 	toString(): string {
// 		return `[${this.source}] ${this.eventType} (${this.id})`;
// 	}
// }

// export { BaseEvent } from './BaseEvent.js';
// export { UserEvent } from './UserEvents.js';
