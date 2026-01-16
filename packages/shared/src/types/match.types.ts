
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
	export type AcceptMatchParams = Static<typeof MatchSchemas.AcceptMatchParams>;
	export type RejectMatchParams = Static<typeof MatchSchemas.RejectMatchParams>;
	export type CancelMatchParams = Static<typeof MatchSchemas.CancelMatchParams>;
	export type CancelMatchResponse = Static<typeof MatchSchemas.CancelMatchResponse>;

    // 2. Tipos de Base de Datos (SQLite)
    // Usamos Snake_Case porque así es SQL.
    // Estructura "Desnormalizada": Guardamos scores en 
	// la misma fila para evitar JOINs constantes.
    export interface MatchRow {
        id: string;
        status: MatchStatus;         // 'pending' | 'active' | 'finished' | 'rejected'
        
        // Player 1
        player1_id: string;
        player1_score: number;
        
        // Player 2 (Puede ser NULL si está esperando rival)
        player2_id: string | null;
        player2_score: number | null;
        
        winner_id: string | null;
        
        created_at: number;     // Timestamp numérico
		finished_at: number | null;
		
		game_mode: string;
        target_score: number;
    }
}
