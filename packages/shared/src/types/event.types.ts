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
	// TODO este payload para qué es? si es para JWT debería ser el mismo en todo el proyecto... si es para otra cosa, podría seguir siendo el mismo userPayload siempre?
}
// TODO Auditar toda la construccion de tipos y schemas e interfaces de eventos

//---------------------------------------------
// 3. Eventos Concretos
//---------------------------------------------
// TODO quién consume estos interfaces definidos a continuación?

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

