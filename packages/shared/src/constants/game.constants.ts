import { GameTypes } from '../types/game.types.js';

export namespace GameConstants {

	// game modes
	export const GAME_MODE = {
		CLASSIC: 'classic',
		SPEED: 'speed',
		PRO: 'pro',
	} as const;
	export type GameModeType = typeof GAME_MODE[keyof typeof GAME_MODE];

	// player actions
	export const GAME_ACTION = {
		MOVE_UP: 'MOVE_UP',
		MOVE_DOWN: 'MOVE_DOWN',
		STOP: 'STOP',
		PAUSE_TOGGLE: 'PAUSE_TOGGLE',
	} as const;
	export type GameAction = typeof GAME_ACTION[keyof typeof GAME_ACTION];

	// runtime game status (not the same as match db status)
	export const GAME_STATUS = {
		WAITING:  'WAITING',
		PLAYING:  'PLAYING',
		PAUSED:   'PAUSED',
		FINISHED: 'FINISHED',
		ABORTED:  'ABORTED',
	} as const;
	export type GameStatus = typeof GAME_STATUS[keyof typeof GAME_STATUS];

	// websocket update type
	export const GAME_UPDATE_TYPE = {
		STATE_CHANGED:  'state_changed',
		SCORE_UPDATE:   'score_updated',
		GAME_FINISHED:  'game_finished',
		PAUSED:         'game_paused',
		RESUMED:        'game_resumed',
	} as const;
	export type GameUpdateType = typeof GAME_UPDATE_TYPE[keyof typeof GAME_UPDATE_TYPE];

	// game over reasons
	export const GAME_OVER_REASON = {
		NORMAL:                'normal',
		OPPONENT_DISCONNECTED: 'opponent_disconnected',
		TIMEOUT:               'timeout',
	} as const;
	export type GameOverReason = typeof GAME_OVER_REASON[keyof typeof GAME_OVER_REASON];

	// match cancelled reasons
	export const MATCH_CANCELLED_REASON = {
		HOST_DISCONNECTED:  'host_disconnected',
		INVITATION_EXPIRED: 'invitation_expired',
		HOST_CANCELLED:     'host_cancelled',
	} as const;
	export type MatchCancelledReason = typeof MATCH_CANCELLED_REASON[keyof typeof MATCH_CANCELLED_REASON];

	// canvas and physics constants
	export const GAME_CONSTANTS = {
		CANVAS_WIDTH:   800,
		CANVAS_HEIGHT:  600,
		PADDLE_WIDTH:   10,
		PADDLE_HEIGHT:  60,
		BALL_RADIUS:    6,
		WALL_MARGIN:    15,
		FPS:            60,
		SCORE: {
			DEFAULT: 11,
			MIN:     5,
			MAX:     21,
			STEP:    2,
		},
		IN_MATCH_DISCONNECTION_TIMEOUT: 15000,
	} as const;

	// mode configs
	export const GAME_MODES: Record<string, GameTypes.GameModeConfig> = {
		classic: { paddleSpeed: 9,  ballSpeedBase: 6, ballAcceleration: 0,    hasInertia: false },
		speed:   { paddleSpeed: 18, ballSpeedBase: 6, ballAcceleration: 0.10, hasInertia: false },
		pro:     { paddleSpeed: 18, ballSpeedBase: 6, ballAcceleration: 0.10, hasInertia: true, friction: 0.88 },
	};

	// player side
	export const PLAYER_SIDE = {
		LEFT: 'left',
		RIGHT: 'right'
	} as const;
	export type PlayerSide = typeof PLAYER_SIDE[keyof typeof PLAYER_SIDE];

}
