import { BaseEvent, EventHandler } from '../base.handler.js';
import { CommsService } from '../../comms.service.js';
import { REDIS_CHANNELS } from '@transcendence/shared';
import { GameUpdateEvent } from './game.events.js';

export class GameEventHandler implements EventHandler {
	channels = [REDIS_CHANNELS.GAME_UPDATE];

	async handle(event: BaseEvent, comms: CommsService): Promise<void> {
		const gameEvent = event as GameUpdateEvent;

		console.log(`[GameHandler] Evento recibido: ${gameEvent.type} para match ${gameEvent.payload.matchId}`);

		// TODO: Implementar lógica de broadcast
		// Ejemplo: broadcast del estado del juego a espectadores
		// comms.broadcastToUsers(spectatorIds, {
		//     type: REDIS_CHANNELS.GAME_UPDATE,
		//     payload: gameEvent.payload
		// });
	}
}
