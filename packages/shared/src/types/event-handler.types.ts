import type { BaseEvent } from './event.types.js';

/**
 * Interface mínima que un servicio debe implementar para manejar eventos.
 * Usa inversión de dependencias: shared define el contrato, comms implementa.
 */
export interface IEventService {
	broadcastToUsers(userIds: string[], event: any): Promise<void>;
	closeUserConnection(userId: string): Promise<void>;
}

/**
 * Handler genérico de eventos.
 * TService es el tipo concreto del servicio (ej: CommsService en comms).
 */
export interface EventHandler<TService extends IEventService = IEventService> {
	channels: string[];
	handle(event: BaseEvent, service: TService): Promise<void>;
}
