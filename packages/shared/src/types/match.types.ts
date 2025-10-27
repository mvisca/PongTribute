import { MatchId, UserId } from "./branded.types";
import { PlayerSlot, PlayerPosition, MatchStatus } from "../constants/match.constants";

// ============================================================================
// ENTIDADES DE DOMINIO
// ============================================================================

// export type PlayerSlot = "Player1" | "Player2";
// export type PlayerPosition = "left" | "right";

// ============================================================================
// ENTIDADES DE DOMINIO
// ============================================================================

/**
* Participante en una partida
* Representa a un jugador y su info dentro de un Match
*/
export interface MatchPlayer {
	matchId: MatchId;
	userId: UserId;
	playerSlot: PlayerSlot;
	playerPosition: PlayerPosition;
	score: number;
};

/**
* Tipo de array de exactamente dos MatchPlayer\
* 	id: MatchId;\
* 	status: MatchStatus;\
* 	players: MatchPlayers;\
* 	winnerId: UserId | null;\
* 	createdAt: Date;
*/
export type MatchPlayers = [MatchPlayer, MatchPlayer];

/**
* Partida completa (Aggregate Root)
* Siempre tiene exactamente 2 jugadores (1v1)
*/
export interface Match {
	id: MatchId;
	status: MatchStatus;
	players: MatchPlayers;
	winnerId: UserId | null;
	createdAt: Date;
}

// ============================================================================
// DTOs - INPUT (Crear)
// ============================================================================

/**
* Datos para crear Player
* Enviados por el backend para crear la partida
*/
export interface CreatePlayerData {
	userId: UserId;
	playerSlot: PlayerSlot;
	playerPosition: PlayerPosition;
}

/**
 * Data que se pasa al metodo 'create()' de Match \
 * @param '[CreatePlayerData, CreatePlayerData]'\
 * CreatePlayerData = {UserId, PlayerSlot, PlayerPosition} 
 */
export type CreateMatchData = [CreatePlayerData, CreatePlayerData];

// ============================================================================
// REPRESENTACIÓN SQL (Snake_case)
// ============================================================================

/**
* Row exacta de tabla 'matches'
* Expresa keys snake_case con los tipos de la tabla
*/
export interface MatchRow {
	id: string;
	status: string;
	winner_id: string | null;
	created_at: number;
}

/**
* Row exacta de tabla 'match_participants'
* Expresa keys snake_case con los tipos de la tabla
*/
export interface MatchPlayerRow {
	user_id: string;
	match_id: string;
	player_slot: string;
	player_position: string;
	score: number;
}