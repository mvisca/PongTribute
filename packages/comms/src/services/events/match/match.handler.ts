//HANDLER DE LOS EVENTOS REDIS PUBLICADOS POR GAME -> EVENTOS WEBSOCKET 

import { CommsEventHandler } from "../base.handler.js";
import { CommsService } from "../../comms.service.js";
import {
	EventsTypes,
	TRANSCENDENCE_EVENTS,
	TranscendenceEventsTypes,
	WEBSOCKET_EVENTS,
	WebSocketEventsTypes
} from "@transcendence/shared";
import { createLogger, type AppLogger } from '@transcendence/shared';


type MatchEvent =
	| TranscendenceEventsTypes.MatchFoundEvent
	| TranscendenceEventsTypes.MatchQueueTimeoutEvent
	| TranscendenceEventsTypes.MatchInviteEvent
	| TranscendenceEventsTypes.MatchStartedEvent
	| TranscendenceEventsTypes.MatchRejectedEvent
	| TranscendenceEventsTypes.MatchCancelledEvent;

export class MatchEventHandler implements CommsEventHandler {
	private log: AppLogger = createLogger('MatchEventHandler');

	eventTypes = [
		TRANSCENDENCE_EVENTS.MATCH_FOUND,
		TRANSCENDENCE_EVENTS.MATCH_QUEUE_TIMEOUT,
		TRANSCENDENCE_EVENTS.MATCH_INVITE,
		TRANSCENDENCE_EVENTS.MATCH_STARTED,
		TRANSCENDENCE_EVENTS.MATCH_REJECTED,
		TRANSCENDENCE_EVENTS.MATCH_CANCELLED
	];

	async handle(
		event: EventsTypes.BaseEvent,
		commsService: CommsService
	): Promise<void> {
		const matchEvent = event as MatchEvent;

		switch (matchEvent.type) { 
			case TRANSCENDENCE_EVENTS.MATCH_FOUND:
				await this.handleMatchFound(
					matchEvent as TranscendenceEventsTypes.MatchFoundEvent,
					commsService
				);
				break;
			
			case TRANSCENDENCE_EVENTS.MATCH_QUEUE_TIMEOUT:
				await this.handleMatchQueueTimeout(
					matchEvent as TranscendenceEventsTypes.MatchQueueTimeoutEvent,
					commsService
				);
				break;
			
			case TRANSCENDENCE_EVENTS.MATCH_INVITE:
				await this.handleMatchInvite(
					matchEvent as TranscendenceEventsTypes.MatchInviteEvent,
					commsService
				);
				break;
			
			case TRANSCENDENCE_EVENTS.MATCH_STARTED:
				await this.handleMatchStarted(
					matchEvent as TranscendenceEventsTypes.MatchStartedEvent,
					commsService
				);
				break;
			
			case TRANSCENDENCE_EVENTS.MATCH_REJECTED:
				await this.handleMatchRejected(
					matchEvent as TranscendenceEventsTypes.MatchRejectedEvent,
					commsService
				);
				break;
			
			case TRANSCENDENCE_EVENTS.MATCH_CANCELLED:
				await this.handleMatchCancelled(
					matchEvent as TranscendenceEventsTypes.MatchCancelledEvent,
					commsService
				);
				break;
		}
	}

	private async handleMatchFound(
		event: TranscendenceEventsTypes.MatchFoundEvent,
		commsService: CommsService
	): Promise<void> {
		this.log.info({ playerIds: event.payload.playerIds }, 'Match found');

		const wsMessage: WebSocketEventsTypes.MatchFound = {
			type: WEBSOCKET_EVENTS.MATCH_FOUND,
			timestamp: event.timestamp,
			payload: {
				matchId: event.payload.matchId
			}
		};

		// Notifica a ambos players (el front debe ser idempotente y tenerlo en cuenta)
		commsService.broadcastToUsers(event.payload.playerIds, wsMessage);
	}



	private async handleMatchQueueTimeout(
		event: TranscendenceEventsTypes.MatchQueueTimeoutEvent,
		commsService: CommsService
	): Promise<void> {
		this.log.info({ userId: event.payload.userId }, 'Queue timeout');

		const wsMessage: WebSocketEventsTypes.MatchQueueTimeout = {
			type: WEBSOCKET_EVENTS.MATCH_QUEUE_TIMEOUT,
			timestamp: event.timestamp,
			payload: {
				reason: event.payload.reason
			}
		};

		// Notifica al user que caducó su tiempo en cola
		// Al ser un array de un unico elemento lo envolvemos en los corchetes 
		// para satisfacer la firma del metodo en TypeScript
		commsService.broadcastToUsers([event.payload.userId], wsMessage);
	}


	private async handleMatchInvite(
		event: TranscendenceEventsTypes.MatchInviteEvent,
		commsService: CommsService
	): Promise<void> {
		this.log.info({ inviterId: event.payload.inviterId }, 'Match invite');

		const wsMessage: WebSocketEventsTypes.MatchInvite = {
			type: WEBSOCKET_EVENTS.MATCH_INVITE,
			timestamp: event.timestamp,
			payload: {
				matchId: event.payload.matchId,
				inviterId: event.payload.inviterId,
				inviterUsername: event.payload.inviterUsername,
				inviterAvatar: event.payload.inviterAvatar,
				gameMode: event.payload.gameMode,
				expiresAt: event.payload.expiresAt
			}
		};

		// Notifica SOLO al invitado de la partida
		commsService.broadcastToUsers([event.payload.inviteeId], wsMessage);
	}


	private async handleMatchStarted(
		event: TranscendenceEventsTypes.MatchStartedEvent,
		commsService: CommsService
	): Promise<void> {
		this.log.info({ matchId: event.payload.playerIds }, 'Match started');

		const wsMessage: WebSocketEventsTypes.MatchStarted = {
			type: WEBSOCKET_EVENTS.MATCH_STARTED,
			timestamp: event.timestamp,
			payload: {
				matchId: event.payload.matchId
			}
		};

		// Notifica a ambos players
		commsService.broadcastToUsers(event.payload.playerIds, wsMessage);
	}


	private async handleMatchRejected(
		event: TranscendenceEventsTypes.MatchRejectedEvent,
		commsService: CommsService
	): Promise<void> {
		this.log.info({ matchId: event.payload.rejectorId }, 'Match refuted by');

		const wsMessage: WebSocketEventsTypes.MatchRejected = {
			type: WEBSOCKET_EVENTS.MATCH_REJECTED,
			timestamp: event.timestamp,
			payload: {
				matchId: event.payload.matchId,
				rejectorId: event.payload.rejectorId
			}
		};

		// Notifica SOLO al creador de la invitación (Inviter)
		// Entre [] porque espera un array y solo hay 1 elemento
		commsService.broadcastToUsers([event.payload.inviterId], wsMessage);
	}

	private async handleMatchCancelled(
		event: TranscendenceEventsTypes.MatchCancelledEvent,
		commsService: CommsService
	): Promise<void> {
		this.log.info({ matchId: event.payload.reason }, 'Match cancelled due');

		const wsMessage: WebSocketEventsTypes.MatchCancelled = {
			type: WEBSOCKET_EVENTS.MATCH_CANCELLED,
			timestamp: event.timestamp,
			payload: {
				matchId: event.payload.matchId,
				cancelledById: event.payload.cancelledById,
				reason: event.payload.reason
			},
		};

		// Notifica a los dos players
		commsService.broadcastToUsers(event.payload.notifiedUserIds, wsMessage);
	}


}