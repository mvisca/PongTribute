//Hace la funcion de un traductor (de datos de sql a respuesta JSON)
//Mapper es el encargado de convertir lo que sale de la base de 
// datos al objeto que entiende la lógica de negocio y el frontend.
import { MatchTypes, GameTypes } from '@transcendence/shared';

export class MatchMapper {

    /**
     * Convierte una Fila de BD (Snake_Case) -> Objeto de Dominio (CamelCase)
     */
    static toDomain(row: MatchTypes.MatchRow): MatchTypes.Match {
        // 1. Manejo del Jugador 2 (puede ser NULL en DB si está esperando rival)
        let player2Obj: MatchTypes.MatchPlayer | undefined = undefined;

        if (row.player2_id) {
            player2Obj = {
                userId: row.player2_id,
                username: row.player2_username ?? "Unknown",
				avatar: row.player2_avatar ?? "",
                score: row.player2_score ?? 0, // Si es null, ponemos 0
                isWinner: row.winner_id === row.player2_id
            };
        }

        // 2. Construcción del objeto Match
        return {
            id: row.id,
            status: row.status, // Ya coinciden los strings 'pending'|'active'|'finished'
            
            player1: {
                userId: row.player1_id,
                username: row.player1_username,
				avatar: row.player1_avatar,
                score: row.player1_score,
                isWinner: row.winner_id === row.player1_id
            },
            player2: player2Obj,
            winnerId: row.winner_id,
            
            // 3. Conversión de Fechas: Number (DB) -> ISO String (API)
            createdAt: new Date(row.created_at).toISOString(),
            finishedAt: row.finished_at ? new Date(row.finished_at).toISOString() : undefined,
			
			// Como en DB es TEXT, TypeScript lo trata como string genérico.
            // Lo casteamos a 'any' o al tipo Union específico si es necesario, 
            // pero el Schema de salida ya lo validará.
            gameMode: row.game_mode as GameTypes.GameModeType, 
            targetScore: row.target_score
        };
    }
}