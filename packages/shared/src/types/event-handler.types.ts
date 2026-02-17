import type { EventsTypes, WebSocketEventsTypes } from './event.types.js';
import { UserTypes } from './user.types.js';

/**
 * Interface mínima que un servicio debe implementar para manejar eventos.
 * Usa inversión de dependencias: shared define el contrato, comms implementa.
 */
export interface IEventService {
	broadcastToUsers(userIds: UserTypes.UserId[], event: WebSocketEventsTypes.AnyWsMessage): Promise<void>;
	closeUserConnection(userId: string): Promise<void>;
}

/**
 * Handler genérico de eventos.
 * TService es el tipo concreto del servicio (ej: CommsService en comms).
 */
export interface EventHandler<TService extends IEventService = IEventService> {
	channels: string[];
	handle(event: EventsTypes.BaseEvent, service: TService): Promise<void>;
}