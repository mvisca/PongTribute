import { BaseEvent } from '../base.handler.js';
import { REDIS_CHANNELS } from '@transcendence/shared';

interface GameEventPayload {
	matchId: string;
	// TODO: Ampliar cuando se implemente la lógica de broadcast de partidas
	// Posibles campos: gameState, players, spectators, etc.
}

export interface GameUpdateEvent extends BaseEvent {
	type: typeof REDIS_CHANNELS.GAME_UPDATE;
	payload: GameEventPayload;
}
