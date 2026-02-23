import { EventsTypes, TRANSCENDENCE_EVENTS, TranscendenceEventsTypes, WEBSOCKET_EVENTS, WebSocketEventsTypes } from "@transcendence/shared";
import { CommsEventHandler } from "../base.handler.js";
import { CommsService } from "../../comms.service.js";

export class GameEventHandler implements CommsEventHandler {
	eventTypes = [ TRANSCENDENCE_EVENTS.GAME_OVER ]

	async handle(
		event: EventsTypes.BaseEvent,
		commsService: CommsService
	): Promise<void> {
		const gameOverEvent = event as TranscendenceEventsTypes.GameOverEvent;

		const { matchId, winnerId, player1Score, player2Score, reason } = gameOverEvent.payload;
		const { playerIds } = gameOverEvent.payload;

		const wsMessage: WebSocketEventsTypes.GameOver = {
			type: WEBSOCKET_EVENTS.GAME_OVER,
			timestamp: gameOverEvent.timestamp,
			payload: {
				matchId,
				winnerId,
				player1Score,
				player2Score,
				reason
			}
		};

		commsService.broadcastToUsers(playerIds, wsMessage);
	}
}