//jocuni-p: REEMPLAZO CONTENIDO PARA ELIMINAR COMPLEJIDAD DE TUPLAS (MatchPlayers) PARA ALINEARNOS CON SCHEMAS NUEVOS 

// import { PlayerPosition, PlayerSlot, MatchStatus } from "../index.js"; 

// // ============================================================================
// // ENTIDADES DE DOMINIO
// // ============================================================================

// // export type PlayerSlot = "Player1" | "Player2";
// // export type PlayerPosition = "left" | "right";

// // ============================================================================
// // ENTIDADES DE DOMINIO
// // ============================================================================

// /**
// * Participante en una partida
// * Representa a un jugador y su info dentro de un Match
// */
// export interface MatchPlayer {
// 	matchId: string;
// 	userId: string;
// 	playerSlot: PlayerSlot;
// 	playerPosition: PlayerPosition;
// 	score: number;
// };

// /**
// * Tipo de array de exactamente dos MatchPlayer\
// * 	id: string;\
// * 	status: MatchStatus;\
// * 	players: MatchPlayers;\
// * 	winnerId: string | null;\
// * 	createdAt: Date;
// */
// export type MatchPlayers = [MatchPlayer, MatchPlayer];

// /**
// * Partida completa (Aggregate Root)
// * Siempre tiene exactamente 2 jugadores (1v1)
// */
// export interface Match {
// 	id: string;
// 	status: MatchStatus;
// 	players: MatchPlayers;
// 	winnerId: string | null;
// 	createdAt: Date;
// }

// // ============================================================================
// // DTOs - INPUT (Crear)
// // ============================================================================

// /**
// * Datos para crear Player
// * Enviados por el backend para crear la partida
// */
// export interface CreatePlayerData {
// 	userId: string;
// 	playerSlot: PlayerSlot;
// 	playerPosition: PlayerPosition;
// }

// /**
//  * Data que se pasa al metodo 'create()' de Match \
//  * @param '[CreatePlayerData, CreatePlayerData]'\
//  * CreatePlayerData = {UserId, PlayerSlot, PlayerPosition} 
//  */
// export type CreateMatchData = [CreatePlayerData, CreatePlayerData];

// // ============================================================================
// // REPRESENTACIÓN SQL (Snake_case)
// // ============================================================================

// /**
// * Row exacta de tabla 'matches'
// * Expresa keys snake_case con los tipos de la tabla
// */
// export interface MatchRow {
// 	id: string;
// 	status: string;
// 	winner_id: string | null;
// 	created_at: number;
// }

// /**
// * Row exacta de tabla 'match_participants'
// * Expresa keys snake_case con los tipos de la tabla
// */
// export interface MatchPlayerRow {
// 	user_id: string;
// 	match_id: string;
// 	player_slot: string;
// 	player_position: string;
// 	score: number;
// }

import { Static } from '@sinclair/typebox';
import { MatchSchemas } from '../schemas/match.schema.js';

export namespace MatchTypes {
    // 1. Tipos inferidos de TypeBox (para uso en Controllers/Services)
    export type Match = Static<typeof MatchSchemas.Match>;
    export type MatchPlayer = Static<typeof MatchSchemas.MatchPlayer>;
    export type MatchStatus = Static<typeof MatchSchemas.MatchStatus>;
    
    // DTOs
    export type CreateMatchBody = Static<typeof MatchSchemas.CreateMatchBody>;
    export type GetMatchParams = Static<typeof MatchSchemas.GetMatchParams>;

    // 2. Tipos de Base de Datos (SQLite)
    // Usamos Snake_Case porque así es SQL.
    // Estructura "Desnormalizada": Guardamos scores en la misma fila para evitar JOINs constantes.
    export interface MatchRow {
        id: string;
        status: string;         // 'pending' | 'active' | 'finished'
        
        // Player 1
        player1_id: string;
        player1_score: number;
        
        // Player 2 (Puede ser NULL si está esperando rival)
        player2_id: string | null;
        player2_score: number | null;
        
        winner_id: string | null;
        
        created_at: number;     // Timestamp numérico
        finished_at: number | null;
        is_private: number;     // 1 = true, 0 = false
    }
}
