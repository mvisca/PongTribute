import { CommsService } from '../../comms.service.js';
import { CommsEventHandler } from '../base.handler.js';
import {
	TRANSCENDENCE_EVENTS,
	WEBSOCKET_EVENTS,
	TranscendenceEventsTypes,
	WebSocketEventsTypes,
	EventsTypes
} from '@transcendence/shared';

export class GameEventHandler implements CommsEventHandler {
	eventTypes = [ TRANSCENDENCE_EVENTS.GAME_UPDATE ];
	
	async handle(
		event: EventsTypes.BaseEvent,
		commsService: CommsService
	): Promise<void> {
		
		const gameEvent = event as TranscendenceEventsTypes.GameUpdateEvent;
		
		console.log(`[GameHandler] Evento recibido: ${gameEvent.type} para match ${gameEvent.matchId}`);
		
		// Extraer playerIds del payload
		const { playerIds } = gameEvent.payload.match
		? {
			playerIds: [
				gameEvent.payload.match.player1.userId,
				gameEvent.payload.match.player2.userId,
			],
		}
		: { playerIds: [] };
		
		if (playerIds.length === 0) return;
		const wsMessage: WebSocketEventsTypes.GameUpdate = {
			type: WEBSOCKET_EVENTS.GAME_UPDATE,
			timestamp: gameEvent.timestamp,
			payload: {
				matchId: gameEvent.matchId,
				gameState: gameEvent.payload.gameState,
				updateType: gameEvent.payload.updateType,
			}
		};
		
		commsService.broadcastToUsers(playerIds, wsMessage);
	}
}