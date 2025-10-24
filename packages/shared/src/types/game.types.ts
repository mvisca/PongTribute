/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   game.types.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: m <m@student.42.fr>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/20 01:30:00 by m                 #+#    #+#             */
/*   Updated: 2025/10/20 21:09:59 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */


/* export enum GameTitle {
  PONG = "pong"
}

export enum CourtType {
  TWO_PLAYERS = "2_players"
}

export enum GameStatus {
  COUNTDOWN = "countdown",
  PLAYING = "playing",
  RECONNECTING = "reconnecting",
  DISCONNECTED = "disconnected",
  FINISHED = "finished"
}

export enum Position {
  LEFT = "left",
  RIGHT = "right"
}

export enum PlayerSlot {
  PLAYER_ONE = "player_one",
  PLAYER_TWO = "player_two"
}

// ==== INTERFACES ====

export interface PlayerState {
  playerId: string;
  isReady: boolean;
  connected: boolean;
  lastSeenAt: number;
  position: Position;
  axis: number; // [-1, 1] normalizado
}

export interface BallState {
  x: number; // [0, 1] normalizado
  y: number; // [0, 1] normalizado
  velocityX: number;
  velocityY: number;
}

export interface GameScore {
  [PlayerSlot.PLAYER_ONE]: number;
  [PlayerSlot.PLAYER_TWO]: number;
}

export interface GameState {
  gameId: string;
  gameTitle: GameTitle;
  courtType: CourtType;
  status: GameStatus;
  stateChangedAt: number;
  countdownDuration: number;
  players: Record<PlayerSlot, PlayerState>;
  ball: BallState;
  score: GameScore;
  winner: PlayerSlot | null;
} */