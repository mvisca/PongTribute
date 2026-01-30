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
// 3. Eventos Concretos
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
        updatedFields: string[];
    };
}

// 4. Union Type (Vital para los switch/case en los consumidores)
export type SystemEvent = 
    | UserLoginEvent 
    | UserLogoutEvent
    | UserProfileUpdatedEvent;






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
