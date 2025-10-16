/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   game.types.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: mvisca-g <mvisca-g@student.42barcelona.com>                        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/10/14 18:33:14 by m                 #+#    #+#             */
/*   Updated: 2025/10/15 00:16:30 by m                ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ==== ENUMS y TYPES ====

// Define tipos de juego (incluido para hacer extensible)
export enum GameTitle {
	PONG = "pong"
	// futuro >> SNAKE = "snake"
}

// Define tipos de cancha
export enum CourtType {
	TWO_PLAYERS = "2_players",
	// THREE_PLAYERS = "3_players", // no en Pong
	FOUR_PLAYERS = "4_players",
	// FIVE_PLAYERS = "5_players", // no en Pong... o sí?
	SIX_PLAYERS = "6_players"
}

// Define estado de partida
export enum GameStatus {
	COUNTDOWN = "countdown",
	PLAYING = "playing",
	RECONNECTING = "reconnecting",
	DISCONECTED = "disconnected",
	FINISHED = "finished"
}

// Define condicional el tipo de posiciones la cancha
// //////// CONDICIONAL???
export enum Position {
	LEFT = "left",
	RIGHT = "right",
	TOP = "top",
	DOWN = "down",
	LEFT_TOP = "left-top",
	RIGHT_DOWN = "right_down"
}

//////////////////////////
// Condicionales seran
// TwoPositions {...}
// FourPositions {...}
// SixPositions {...}
// enum Position { TwoPositions | ForPositions | SixPositions }

// Puestos que puede haber en el juego, máximo 6
export type PlayerSlot = "slot1" | "slot2" | "slot3" | "slot4" | "slot5" | "slot6";
/////////////////// Podría ser enum?

// ==== INTERFACES DE GameState ====

// Define estado de jugador en partida Pong
export interface PlayerState {
	playerId: string;
	isReady: boolean;
	connected: boolean;
	lastSeenAt: number; // Unix timestamp
	position: Position; // Enum definido arriba
	axis: number; // [0 -1] Normalizado para mutidispositivo
}

// Define estado de pelota en partida Pong
export interface BallState {
	x: number; // [0 -1] Normalizado para mutidispositivo
	y: number; // [0 -1] Normalizado para mutidispositivo
}

export interface GameScore {
	score: { [K in PlayerSlot]?: number }
	// Mapped type: valores de PongPlayerSlot (todos o no todos?) de tipo number
}

export interface GameState {
	// Identificación de partida
	GameId: string; // puede ser un tipo más único de id /////////
	gameTitle: GameTitle;
	courtType: CourtType;
	
	// Estado temporal de partida
	status: GameStatus;
	stateChangedAt: number;
	countdownDuration: number; // 3s para inicio de partida o 1s al reconnectar 
	
	// Jugadores
	players: Record<PlayerSlot, PlayerState>;

	ball: BallState;
	score: GameScore;
	
	winner: PlayerSlot | null;
	///////////// que tal separar pong en pong.types.ts y game.types.ts tiene lo general??? pros y cons
}