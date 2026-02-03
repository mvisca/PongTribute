import { CommsService } from '../comms.service.js';

export interface BaseEvent {
	type: string;
	timestamp: number;
}

export interface EventHandler {
	channels: string[]; // Los canales Redis que maneja
	handle(event: BaseEvent, commsService: CommsService): Promise<void>; 
}
