import { 
	TRANSCENDENCE_EVENTS,
	WEBSOCKET_EVENTS
} from '../constants/event.constants.js';

import { GameConstants } from '../constants/game.constants.js';

import type { GameTypes } from './game.types.js';
import { UserTypes } from './user.types.js';

// ============================================================================
// TIPOS REUTILIZABLES
// ============================================================================

// Payload compartido por  UserLoginEvent, UserLogoutEvent y UserProfileUpdatedEvent
export interface UserInfoPayload {
	userId: UserTypes.UserId;
	username: string;
	avatar: string;
	email: string;
	lastLogoutAt: number;
	isOnline: boolean;
	friendsIds?: string[];
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
// TRANSCENDENCE_EVENTS — Redis (Backend to Backend)
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
		//payload: UserInfoPayload;
		payload: {
			userId: string;
		}
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
			inviterUsername: string;
			inviterAvatar: string;
			inviteeId: string;
			gameMode: GameConstants.GameModeType;
			expiresAt: number;
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
			notifiedUserIds: string[];
			reason?: GameConstants.MatchCancelledReason;
		};
	}

	export interface MatchBotRequestedEvent extends EventsTypes.BaseEvent {
		type: typeof TRANSCENDENCE_EVENTS.MATCH_BOT_REQUESTED;
		payload: {
			matchId: string;
			gameMode: GameConstants.GameModeType;
		};
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
		| MatchBotRequestedEvent
		| FriendRequestEvent
		| FriendAcceptedEvent
		| FriendRemovedEvent;
}

// ============================================================================
// WEBSOCKET_EVENTS — WebSocket (Backend to Frontend)
// Cada interfaz describe exactamente lo que llega al browser.
// El frontend solo necesita este namespace para tipar los mensajes entrantes.
// ============================================================================

export namespace WebSocketEventsTypes {

	// ── Mensaje específico para GAME_UPDATE simplificado para frontend ───────
	export interface GameUpdate {
		type: typeof WEBSOCKET_EVENTS.GAME_UPDATE;
		timestamp: number;
		payload: {
			matchId: string;
			gameState: GameTypes.GameDynamicState;
			updateType: GameConstants.GameUpdateType;
		};
	} // Omite campos internos del match que el frontend no necesita
	
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

	export interface FriendProfileUpdated extends EventsTypes.BaseEvent {
		type: typeof WEBSOCKET_EVENTS.FRIEND_PROFILE_UPDATED;
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
			requesterId: UserTypes.UserId;
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

	export interface MatchFound extends EventsTypes.BaseEvent {
		type: typeof WEBSOCKET_EVENTS.MATCH_FOUND;
		payload: {
			matchId: string;
		};
	}

	export interface MatchQueueTimeout extends EventsTypes.BaseEvent {
		type: typeof WEBSOCKET_EVENTS.MATCH_QUEUE_TIMEOUT;
		payload: {
			reason: string;
		};
	}

	export interface MatchStarted extends EventsTypes.BaseEvent {
		type: typeof WEBSOCKET_EVENTS.MATCH_STARTED;
		payload: {
			matchId: string;
		};
	}
	
	
	export interface MatchInvite extends EventsTypes.BaseEvent {
		type: typeof WEBSOCKET_EVENTS.MATCH_INVITE;
		payload: {
			matchId: string;
			inviterId: string;
			inviterUsername: string;
			inviterAvatar: string;
			gameMode: GameConstants.GameModeType;
			expiresAt: number;
		};
	}

	export interface MatchCancelled extends EventsTypes.BaseEvent {
		type: typeof WEBSOCKET_EVENTS.MATCH_CANCELLED;
		payload: {
			matchId: string;
			cancelledById: string;
			reason?: GameConstants.MatchCancelledReason;
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

	export interface MatchJoined extends EventsTypes.BaseEvent {
		type: typeof WEBSOCKET_EVENTS.MATCH_JOINED;
		payload: {
			matchId: string;
			opponentId: string;
			opponentUsername: string;
			opponentAvatar: string;
			gameMode: GameConstants.GameModeType;
			status: string;
			playerSide?: 'left' | 'right';
		};
	}

	export interface GameOver extends EventsTypes.BaseEvent {
		type: typeof WEBSOCKET_EVENTS.GAME_OVER;
		payload: {
			matchId: string;
			winnerId: string;
			player1Score: number;
			player2Score: number;
			reason?: GameConstants.GameOverReason;
		};
	}

	// ── Reconexión ────────────────────────────────────────────────────────────

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
		| FriendProfileUpdated
		| FriendRequest
		| FriendAccepted
		| FriendRemoved
		| MatchFound
		| MatchQueueTimeout
		| MatchStarted
		| MatchInvite
		| MatchCancelled
		| MatchRejected
		| MatchJoined
		| GameOver
		| GameUpdate
		| GameOpponentDisconnected
		| GameOpponentReconnected;
}
