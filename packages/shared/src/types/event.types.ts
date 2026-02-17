// packages/shared/src/types/event.types.ts

import { TRANSCENDENCE_EVENTS, WEBSOCKET_EVENTS } from '../constants/event.constants.js';
import { GameMode } from '../schemas/match.schema.js';
import type { GameState } from './game.types.js';
import { UserTypes } from './user.types.js';

// ============================================================================
// TIPOS REUTILIZABLES
// ============================================================================
 
export interface UserInfoPayload {
	userId: UserTypes.UserId;
	username: string;
	avatar: string;
	email: string;
	lastLogoutAt: number;
	isOnline: boolean;
}

// ============================================================================
// BASE
// ============================================================================

export namespace EventsTypes {

	export interface BaseEvent {
		type: string;
		timestamp: number;
		source?: string;
	}
}

// ============================================================================
// TRANSCENDENCE_EVENTS — Redis (Backend → Backend)
// ============================================================================

export namespace TranscendenceEventsTypes {

	// ── User / Social presence ──────────────────────────────────────────────

	export interface UserLoginEvent extends EventsTypes.BaseEvent {
		type: typeof TRANSCENDENCE_EVENTS.USER_LOGIN;
		targetUserId: UserTypes.UserId;
		payload: UserInfoPayload;
	}

	export interface UserLogoutEvent extends EventsTypes.BaseEvent {
		type: typeof TRANSCENDENCE_EVENTS.USER_LOGOUT;
		targetUserId: UserTypes.UserId;
		payload: UserInfoPayload;
	}

	export interface UserProfileUpdatedEvent extends EventsTypes.BaseEvent {
		type: typeof TRANSCENDENCE_EVENTS.USER_PROFILE_UPDATED;
		targetUserId: UserTypes.UserId;
		payload: UserInfoPayload;
	}

	export interface UserDisconnectedEvent extends EventsTypes.BaseEvent {
		type: typeof TRANSCENDENCE_EVENTS.USER_DISCONNECTED;
		targetUserId: UserTypes.UserId;
		payload: UserInfoPayload;
	}

	// ── Friendship ──────────────────────────────────────────────────────────

	export interface FriendRequestEvent extends EventsTypes.BaseEvent {
		type: typeof TRANSCENDENCE_EVENTS.FRIEND_REQUEST;
		payload: {
			senderId: UserTypes.UserId;
			senderUsername: string;
			senderAvatar: string;
			receiverId: UserTypes.UserId;
		};
	}

	export interface FriendAcceptedEvent extends EventsTypes.BaseEvent {
		type: typeof TRANSCENDENCE_EVENTS.FRIEND_ACCEPT;
		payload: {
			acceptorId: UserTypes.UserId;
			acceptorUsername: string;
			acceptorAvatar: string;
			requesterId: UserTypes.UserId;
		};
	}

	export interface FriendRemovedEvent extends EventsTypes.BaseEvent {
		type: typeof TRANSCENDENCE_EVENTS.FRIEND_REMOVE;
		payload: {
			removerId: UserTypes.UserId;
			removedId: UserTypes.UserId;
		};
	}

	// ── Match ───────────────────────────────────────────────────────────────

	export interface MatchFoundEvent extends EventsTypes.BaseEvent {
		type: typeof TRANSCENDENCE_EVENTS.MATCH_FOUND;
		payload: {
			matchId: string;
			playerIds: string[];
			roomId: string;
		};
	}

	export interface MatchQueueTimeoutEvent extends EventsTypes.BaseEvent {
		type: typeof TRANSCENDENCE_EVENTS.MATCH_QUEUE_TIMEOUT;
		payload: {
			userId: string;
			reason: string;
		};
	}

	export interface MatchInviteEvent extends EventsTypes.BaseEvent {
		type: typeof TRANSCENDENCE_EVENTS.MATCH_INVITE;
		payload: {
			matchId: string;
			inviterId: string;
			inviteeId: string;
			gameMode: GameMode;
		};
	}

	export interface MatchStartedEvent extends EventsTypes.BaseEvent {
		type: typeof TRANSCENDENCE_EVENTS.MATCH_STARTED;
		payload: {
			matchId: string;
			playerIds: string[];
			roomId?: string;
		};
	}

	export interface MatchRejectedEvent extends EventsTypes.BaseEvent {
		type: typeof TRANSCENDENCE_EVENTS.MATCH_REJECTED;
		payload: {
			matchId: string;
			rejectorId: string;
			inviterId: string;
		};
	}

	export interface MatchCancelledEvent extends EventsTypes.BaseEvent {
		type: typeof TRANSCENDENCE_EVENTS.MATCH_CANCELLED;
		payload: {
			matchId: string;
			cancelledById: string;
			notifiedUserId: string;
			reason?: string;
		};
	}

	// ── Game ────────────────────────────────────────────────────────────────

	export interface GameUpdatePayload {
		match: {
			id: string;
			status: 'pending' | 'active' | 'finished' | 'rejected' | 'expired';
			player1: {
				userId: string;
				username: string;
				score: number;
				isWinner: boolean;
			};
			player2: {
				userId: string;
				username: string;
				score: number;
				isWinner: boolean;
			};
			winnerId: string | null;
			gameMode: GameMode;
			targetScore: number;
			createdAt: string;
			finishedAt?: string;
		};
		gameState: GameState;
		updateType: 'state_change' | 'score_update' | 'game_finished' | 'game_paused' | 'game_resumed';
		timestamp: number;
	}

	export interface GameUpdateEvent extends EventsTypes.BaseEvent {
		type: typeof TRANSCENDENCE_EVENTS.GAME_UPDATE;
		matchId: string;
		payload: GameUpdatePayload;
	}

	// ── Union ────────────────────────────────────────────────────────────────

	export type SystemEvent =
		| UserLoginEvent
		| UserLogoutEvent
		| UserProfileUpdatedEvent
		| UserDisconnectedEvent
		| MatchFoundEvent
		| MatchQueueTimeoutEvent
		| MatchInviteEvent
		| MatchStartedEvent
		| MatchRejectedEvent
		| MatchCancelledEvent
		| GameUpdateEvent
		| FriendRequestEvent
		| FriendAcceptedEvent
		| FriendRemovedEvent;
}

// ============================================================================
// WEBSOCKET_EVENTS — WebSocket (Backend → Frontend)
// Cada interfaz describe exactamente lo que llega al browser.
// El frontend solo necesita este namespace para tipar los mensajes entrantes.
// ============================================================================

export namespace WebSocketEventsTypes {

	// ── Mensaje específico para GAME_UPDATE simplificado para frontend ───────
	export interface GameUpdateMessage {
		type: typeof WEBSOCKET_EVENTS.GAME_UPDATE;
		timestamp: number;
		payload: {
			matchId: string;
			gameState: GameState;
			updateType: 'state_change' | 'score_update' | 'game_finished' | 'game_paused' | 'game_resumed';
		};
	}			// Omitir campos internos del match que el frontend no necesita

	// ── Presencia social ─────────────────────────────────────────────────────

	export interface FriendOnline extends EventsTypes.BaseEvent {
		type: typeof WEBSOCKET_EVENTS.FRIEND_ONLINE;
		payload: {
			userId: string;
			username: string;
			avatar: string;
		};
	}

	export interface FriendOffline extends EventsTypes.BaseEvent {
		type: typeof WEBSOCKET_EVENTS.FRIEND_OFFLINE;
		payload: {
			userId: string;
			username: string;
			avatar: string;
		};
	}

	// ── Notificaciones de amistad ───────────────────────────────────────────

	export interface FriendRequest extends EventsTypes.BaseEvent {
		type: typeof WEBSOCKET_EVENTS.FRIEND_REQUEST;
		payload: {
			senderId: UserTypes.UserId;
			senderUsername: string;
			senderAvatar: string;
		};
	}

	export interface FriendAccepted extends EventsTypes.BaseEvent {
		type: typeof WEBSOCKET_EVENTS.FRIEND_ACCEPT;
		payload: {
			acceptorId: UserTypes.UserId;
			acceptorUsername: string;
			acceptorAvatar: string;
		};
	}

	export interface FriendRemoved extends EventsTypes.BaseEvent {
		type: typeof WEBSOCKET_EVENTS.FRIEND_REMOVE;
		payload: {
			removerId: UserTypes.UserId;
			removedId: UserTypes.UserId;
		}
	}

	// ── Notificaciones de partida ───────────────────────────────────────────

	export interface MatchInvite extends EventsTypes.BaseEvent {
		type: typeof WEBSOCKET_EVENTS.MATCH_INVITE;
		payload: {
			matchId: string;
			inviterId: string;
			inviterUsername: string;
			inviterAvatar: string;
			gameMode: GameMode;
		};
	}

	export interface MatchCancelled extends EventsTypes.BaseEvent {
		type: typeof WEBSOCKET_EVENTS.MATCH_CANCELLED;
		payload: {
			matchId: string;
			cancelledById: string;
			reason?: string;
		};
	}

	export interface MatchRejected extends EventsTypes.BaseEvent {
		type: typeof WEBSOCKET_EVENTS.MATCH_REJECTED;
		payload: {
			matchId: string;
			rejectorId: string;
		};
	}

	// ── Sala de espera / Game ─────────────────────────────────────────────────

	export interface JoinedMatch extends EventsTypes.BaseEvent {
		type: typeof WEBSOCKET_EVENTS.JOINED_MATCH;
		payload: {
			matchId: string;
			opponentId: string;
			opponentUsername: string;
			opponentAvatar: string;
			gameMode: GameMode;
		};
	}

	export interface GameStart extends EventsTypes.BaseEvent {
		type: typeof WEBSOCKET_EVENTS.GAME_START;
		payload: {
			matchId: string;
			gameState: GameState;
		};
	}

	export interface GameOver extends EventsTypes.BaseEvent {
		type: typeof WEBSOCKET_EVENTS.GAME_OVER;
		payload: {
			matchId: string;
			winnerId: string;
			player1Score: number;
			player2Score: number;
			reason?: 'normal' | 'opponent_disconnected' | 'timeout';
		};
	}

	// ── Reconexión ────────────────────────────────────────────────────────────

	export interface GamePaused extends EventsTypes.BaseEvent {
		type: typeof WEBSOCKET_EVENTS.GAME_PAUSED;
		payload: {
			matchId: string;
			reason?: string;
		};
	}

	export interface GameResumed extends EventsTypes.BaseEvent {
		type: typeof WEBSOCKET_EVENTS.GAME_RESUMED;
		payload: {
			matchId: string;
		};
	}

	export interface GameOpponentDisconnected extends EventsTypes.BaseEvent {
		type: typeof WEBSOCKET_EVENTS.GAME_OPPONENT_DISCONNECTED;
		payload: {
			matchId: string;
			opponentId: string;
			waitSeconds: number;
		};
	}

	export interface GameOpponentReconnected extends EventsTypes.BaseEvent {
		type: typeof WEBSOCKET_EVENTS.GAME_OPPONENT_RECONNECTED;
		payload: {
			matchId: string;
			opponentId: string;
		};
	}

	// ── Union — todo lo que puede llegar al browser ───────────────────────────

	export type AnyWsMessage =
		| FriendOnline
		| FriendOffline
		| FriendRequest
		| FriendAccepted
		| FriendRemoved
		| MatchInvite
		| MatchCancelled
		| MatchRejected
		| JoinedMatch
		| GameStart
		| GameOver
		| GameUpdateMessage
		| GamePaused
		| GameResumed
		| GameOpponentDisconnected
		| GameOpponentReconnected;
}