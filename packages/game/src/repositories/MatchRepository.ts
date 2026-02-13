//Este archivo es el que comunica directamente con la BD

import { MatchTypes, SharedErrors, MatchConstants } from '@transcendence/shared';
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
                id, status, player1_id, player1_username, player1_score, 
				player2_id, player2_username, player2_score, winner_id, 
				created_at, finished_at, game_mode, target_score
            ) VALUES (
                @id, @status, @player1_id, @player1_username, @player1_score,
				 @player2_id, @player2_username, @player2_score, @winner_id, 
				 @created_at, @finished_at, @game_mode, @target_score
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
	 * Actualiza a 'expired' una partida privada 'pending' que no se aprobó ni rechazó..
	 * La llama un cron si alcanza el timeout de 60 seg
	 */
	async expirePendingMatches(): Promise<void> {
		const thresholdTimestamp = Date.now() - MatchConstants.PRIVATE_INVITATION_TIMEOUT_MS;
		const stmt = this.db.prepare(`
        	UPDATE matches
			SET status = ?
			WHERE status = ?
			AND created_at < ?
		`);
		// Ejecutamos pasando el valor para sustituir los '?'
		const info = stmt.run(MatchConstants.MATCH_STATUS.EXPIRED, MatchConstants.MATCH_STATUS.PENDING, thresholdTimestamp);

		// Opcional: Loguea cuántas filas se afectaron para control
		if (info.changes > 0) {
			console.log(`[MatchRepo] Han expirado ${info.changes} invitaciones privadas.`);
		}
    }

	/**
     * updateUsernames
     * Actualiza los nombres desnormalizados cuando un usuario cambia su profile.
     */
    async updateUsernames(userId: string, newUsername: string): Promise<void> {
        // 1. Preparar las sentencias
        const updateP1 = this.db.prepare(`
            UPDATE matches SET player1_username = ? WHERE player1_id = ?
        `);
        const updateP2 = this.db.prepare(`
            UPDATE matches SET player2_username = ? WHERE player2_id = ?
        `);

        // 2. Ejecutar (Better-sqlite3 usa .run() para UPDATES)
        updateP1.run(newUsername, userId);
        updateP2.run(newUsername, userId);
    }

	/**
     * finishMatch
     * Cierra la partida con resultados finales.
     */
    async finishMatch(id: string, winnerId: string, p1Score: number, p2Score: number, finishedAt: number): Promise<void> {
        const stmt = this.db.prepare(`
            UPDATE matches
            SET status = ?, 
                winner_id = ?, 
                player1_score = ?, 
                player2_score = ?, 
                finished_at = ?
            WHERE id = ?
        `);

        const result = stmt.run(MatchConstants.MATCH_STATUS.FINISHED, winnerId, p1Score, p2Score, finishedAt, id);

        if (result.changes === 0) {
            throw new SharedErrors.NotFoundError(`Match with ID ${id} not found to finish.`);
        }
	}
	
	
    /**
	 * deleteMatch
	 * Elimina físicamente una partida. 
	 * Se usa si falla la notificación en Redis
	 * para no dejar partidas "zombies" en la base de datos.
	*/
    async deleteMatch(matchId: string): Promise<void> {
		const stmt = this.db.prepare('DELETE FROM matches WHERE id = ?');
        const result = stmt.run(matchId);
        
        if (result.changes > 0) {
			console.log(`🗑️ [Repository] Partida ${matchId} eliminada correctamente.`);
        } else {
			console.warn(`⚠️ [Repository] Se intentó borrar partida ${matchId} pero no existía.`);
        }
    }
		
	
	
	// ========================================================================
    // LECTURA (QUERIES)
	// ========================================================================
	
	/**
	 * findPendingHostedByUser
	 * Busca invitaciones privadas creadas por este usuario (Host/Player1)
	 * que todavía están esperando respuesta (pending).
	 */
	async findPendingHostedByUser(userId: string): Promise<MatchTypes.MatchRow[]> {
		// Asumimos que quien invita siempre es guardado como player1_id
		const stmt = this.db.prepare(`
			SELECT * FROM matches
			WHERE player1_id = ?
			AND status = ?
		`);

		// Usamos .all() porque devuelve un array de objetos. 
		// Si usara get(), solo devolvería la 1ª coincidencia.
		// con el as le digo que lo que sale de aqui cumple con la interfaz MatchRow
		return stmt.all(userId, MatchConstants.MATCH_STATUS.PENDING) as MatchTypes.MatchRow[];
	}


    /**
     * findActiveMatchByUserId
     * Busca si el usuario ya está jugando o esperando.
     */
    async findActiveMatchByUserId(userId: string): Promise<MatchTypes.MatchRow | null> {
        const stmt = this.db.prepare(`
            SELECT * FROM matches
            WHERE (player1_id = ? OR player2_id = ?)
            AND status IN (?, ?)
            LIMIT 1
        `);
        
        const row = stmt.get(userId, userId, MatchConstants.MATCH_STATUS.ACTIVE, MatchConstants.MATCH_STATUS.PENDING);
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
	
	/**
     * findByUserId
     * Busca partidas terminadas donde user sea el Player1 o el Player2.
     * RETORNO: un Array de objetos (MatchRow[]).
     */
    // El retorno es MatchRow[], nunca null (si no hay, es array vacío)
    async findByUserId(userId: string, limit: number, offset: number): Promise<MatchTypes.MatchRow[]> {
        const stmt = this.db.prepare(`
            SELECT * FROM matches
            WHERE (player1_id = ? OR player2_id = ?)
            AND status = ?
            ORDER BY finished_at DESC
            LIMIT ? OFFSET ?
        `);
        
        // Usa .all() para devolver lista.
        return stmt.all(userId, userId, MatchConstants.MATCH_STATUS.FINISHED, limit, offset) as MatchTypes.MatchRow[];
    }
}
	
