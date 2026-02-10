import { BaseEvent } from '../base.handler.js';
import { REDIS_CHANNELS } from '@transcendence/shared';

interface UserEventPayload {
	username: string;
	avatar: string;
	isOnline: boolean;
}

export interface UserLoginEvent extends BaseEvent {
	type: typeof REDIS_CHANNELS.USER_LOGIN;
	targetUserId: string;
	payload: UserEventPayload;
}
// TODO tras el merge revisar exportacion de tipos inconsistentes
/*
 user.events.ts exporta tipos incompatibles con user.handler.ts
Archivo: packages/comms/src/services/events/user/user.events.ts exporta solo UserLoginEvent. Pero user.handler.ts importa { UserEvent, UserLoginEvent, UserLogoutEvent } — tipos UserEvent y UserLogoutEvent no están definidos ni exportados en user.events.ts. Esto causa un error de compilación TypeScript. El handler de logout hace const userEvent = event as UserEvent, pero UserEvent no existe. Además, handleLogout recibe UserEvent y accede a event.payload.username y event.payload.avatar, pero si UserEvent es simplemente BaseEvent, estos campos no existen.
Severidad: MEDIO — Error de compilación que bloquea el handler de eventos de usuario.
*/

