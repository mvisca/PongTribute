//Este archivo es el que comunica directamente con la BD

import { MatchTypes, SharedErrors } from '@transcendence/shared';
import { getDatabase } from '../connection.js';

/**
 * MatchRepository
 * Capa de Persistencia (Data Access Layer).
 * Responsabilidad única: Traducir objetos de dominio a SQL y viceversa.
 * Patrón de errores: Bubble Up (los errores de DB suben limpios al Controller).
 */
export class MatchRepository {
    // Instancia de better-sqlite3 lista para usar
    private db = getDatabase();

    // ========================================================================
    // ESCRITURA (COMMANDS)
    // ========================================================================

	// Aunque better-sqlite3 es síncrono, mantenemos async en la firma
	// para que el Servicio no se rompa si mañana cambiamos a PostgreSQL.
	
    /**
     * create
     * Inserta una partida pre-construida en la base de datos.
     * @param match Objeto MatchRow completo construido por el Service.
     */
    async create(match: MatchTypes.MatchRow): Promise<void> {
        // SQL Directo. Sin try-catch. Si falla (Unique constraint, etc), explota hacia arriba.
        const stmt = this.db.prepare(`
            INSERT INTO matches (
                id, status, player1_id, player1_score, player2_id, player2_score, 
                winner_id, created_at, finished_at, game_mode, target_score
            ) VALUES (
                @id, @status, @player1_id, @player1_score, @player2_id, @player2_score,
                @winner_id, @created_at, @finished_at, @game_mode, @target_score
            )
        `);
        
        stmt.run(match);
    }


	// ========================================================================
    // ACTUALIZACIONES
    // ========================================================================

	/**
	 * updateStatus
	 * Cambia el status de una partida: (pending -> active) (pending -> rejected)
	 */
	async updateStatus(id: string, status: MatchTypes.MatchStatus): Promise<void> {
        const stmt = this.db.prepare(`
            UPDATE matches 
            SET status = ?
            WHERE id = ?
        `);

        const result = stmt.run(status, id);

        if (result.changes === 0) {
            throw new SharedErrors.NotFoundError(`Match with ID ${id} not found to update status.`);
        }
    }

	/**
     * finishMatch
     * Cierra la partida con resultados finales.
     */
    async finishMatch(id: string, winnerId: string, p1Score: number, p2Score: number, finishedAt: number): Promise<void> {
        const stmt = this.db.prepare(`
            UPDATE matches
            SET status = 'finished', 
                winner_id = ?, 
                player1_score = ?, 
                player2_score = ?, 
                finished_at = ?
            WHERE id = ?
        `);

        const result = stmt.run(winnerId, p1Score, p2Score, finishedAt, id);

        if (result.changes === 0) {
            throw new SharedErrors.NotFoundError(`Match with ID ${id} not found to finish.`);
        }
	}
	

	/**
     * Elimina una partida por su ID.
     * Se usa si falla la notificación en Redis
     * para no dejar partidas "zombies" en la base de datos.
     */
    async delete(matchId: string): Promise<void> {
        const stmt = this.db.prepare('DELETE FROM matches WHERE id = ?');
        stmt.run(matchId);
        console.log(`🗑️ [Repository] Rollback ejecutado: Partida ${matchId} eliminada.`);
    }

	// ========================================================================
    // LECTURA (QUERIES)
	// ========================================================================
	
    /**
     * findActiveMatchByUserId
     * Busca si el usuario ya está jugando o esperando.
     */
    async findActiveMatchByUserId(userId: string): Promise<MatchTypes.MatchRow | null> {
        const stmt = this.db.prepare(`
            SELECT * FROM matches
            WHERE (player1_id = ? OR player2_id = ?)
            AND status IN ('active', 'pending')
            LIMIT 1
        `);
        
        const row = stmt.get(userId, userId);
        return row ? (row as MatchTypes.MatchRow) : null;
    }

    /**
     * findById
     * Búsqueda por PK.
     */
    async findById(id: string): Promise<MatchTypes.MatchRow | null> {
        const stmt = this.db.prepare('SELECT * FROM matches WHERE id = ?');
        const row = stmt.get(id);
        return row ? (row as MatchTypes.MatchRow) : null;
    }
}
	
