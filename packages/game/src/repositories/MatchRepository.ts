//Este archivo es el que comunica directamente con la BD

import { MatchTypes, MatchSchemas } from '@transcendence/shared';
import { getDatabase } from '../connection.js';
import { randomUUID } from 'node:crypto'; // librería nativa de Node


/**
 * MatchRepository
 * Capa de Persistencia (Data Access Layer).
 * Se comunica directamente con SQLite usando 'better-sqlite3'.
 * * NOTA: Aunque better-sqlite3 es síncrono, mantenemos la firma 'async' en 
 * los métodos públicos para facilitar una futura migración a DBs asíncronas (Postgres/MySQL)
 * sin romper el Servicio que consume esta clase.
 */
export class MatchRepository {
	// 1. Obtenemos la conexión lista para usar y la guardamos para usarla
	// en los metodos de la clase sin tener que reconectar cada vez (porque
	//better-squlite3 trabaja de forma sincrona(bloqueante, pero rapidissima)
    private db = getDatabase();

	// ========================================================================
    // MÉTODOS DE BAJO NIVEL (CRUD)
    // ========================================================================

    /**
     * create (Primitive)
     * INSERTA UN REGISTRO crudo (una nueva partida) en la tabla 'matches'.
     * Recibe el objeto 'MatchRow' que ya preparó el Servicio con todos los datos.
     */
	create(match: MatchTypes.MatchRow): void {
		try {
			// 2. Preparamos la sentencia SQL (Query)
			// SQLite compila esto una vez y lo reutiliza.
			const stmt = this.db.prepare(`
				INSERT INTO matches (
					id, status, player1_id, player1_score, player2_id, player2_score, 
					winner_id, created_at, finished_at, game_mode, target_score
				) VALUES (
					@id, @status, @player1_id, @player1_score, @player2_id, @player2_score,
					@winner_id, @created_at, @finished_at, @game_mode, @target_score
				)
			`);
			//@id le dice a SQLite: "Aquí irá un valor que buscaré con 
			// la clave id en el objeto que me pases".

			// 3. Ejecutamos la sentencia y better-sqlite3 inyecta las
			// propiedades del objeto recibido como argumento (contiene
			// valores como match.id, match.status, etc).
			// run(): se usa para cambios INSERT, UPDATE, DELETE (operaciones que
			// no devuelven datos).
			stmt.run(match);
		} catch (error) {
			console.error('❌ [Repo] Error fatal insertando match en DB:', error);
            // Relanzamos para que el Servicio se entere y maneje el error
            throw new Error('Database Insert Failed');
		}
    }

	// ========================================================================
    // MÉTODOS DE NEGOCIO (ALTO NIVEL)
    // ========================================================================

    /**
     * createPublicMatch
     * Genera una partida publica 'ACTIVE' lista para jugarse inmediatamente.
     * Usado por el Matchmaking cuando encuentra dos jugadores.
     */
	async createPublicMatch(
		player1Id: string,
		player2Id: string,
		config?: Partial<MatchSchemas.CreateMatchBodyType>
	): Promise<MatchTypes.MatchRow> {

		// Construcción del objeto Entidad (Row)
        const newMatch: MatchTypes.MatchRow = {
            id: randomUUID(),
            status: 'active',
            player1_id: player1Id,
            player1_score: 0,
            player2_id: player2Id,
            player2_score: 0,
            winner_id: null,
            created_at: Date.now(),
            finished_at: null,
            // Usamos los valores del config o defaults
            game_mode: config?.gameMode || 'classic',
			target_score: config?.targetScore || 11
        };

        // Reusamos la lógica de inserción
        this.create(newMatch);
        // Devolvemos el objeto completo (envuelto en Promise para compatibilidad)
        return newMatch; 
    }

    /**
     * createPrivateMatch
     * Genera una partida privada 'PENDING'.
     * Usado cuando un usuario desafía a otro. Requiere aceptación posterior.
     */
	async createPrivateMatch(
		hostId: string,
		guestId: string,
		config?: Partial<MatchSchemas.CreateMatchBodyType>
	): Promise<MatchTypes.MatchRow> {

        const newMatch: MatchTypes.MatchRow = {
            id: randomUUID(),
            status: 'pending',  // Esperando que el invitado acepte (o se conecte)
            player1_id: hostId,
            player1_score: 0,
            player2_id: guestId, // Ya asignamos el rival, aunque esté pending
            player2_score: 0,
            winner_id: null,
            created_at: Date.now(),
			finished_at: null,
			game_mode: config?.gameMode || 'classic',
            target_score: config?.targetScore || 11
        };

        this.create(newMatch);
        return newMatch;
    }


	// ========================================================================
    // LECTURAS Y ACTUALIZACIONES
    // ========================================================================

	/**
	 * findActiveMatchByUserId
	 * Verifica si el user esta ya en una partida 'active' o 'pending'
	 */
	findActiveMatchByUserId(userId: string): MatchTypes.MatchRow | null {
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
	 * updateStatus
	 * Cambia el status de una partida: (pending -> active) (pending -> rejected)
	 */
	updateStatus(id: string, status: MatchTypes.MatchStatus): void {

		try {
			const stmt = this.db.prepare(`
				UPDATE matches 
				SET status = ?
				WHERE id = ?)
			`);

			const result = stmt.run(status, id);

			if (result.changes === 0) {
				console.warn(`⚠️ [Repo] finishMatch no encontró la partida ID: ${id}`);
			}
		} catch (error) {
			console.error(`❌ [Repo] Error en updateState para ID ${id}:`, error);
			throw error; // Re-lanzar para que el servicio sepa que falló
        }
	}

	/**
     * Elimina una partida por su ID.
     * CRÍTICO para Rollback: Se usa si falla la notificación en Redis
     * para no dejar partidas "zombies" en la base de datos.
     */
    async delete(matchId: string): Promise<void> {
        const stmt = this.db.prepare('DELETE FROM matches WHERE id = ?');
        
        // Ejecutamos la eliminación
        stmt.run(matchId);
        
        console.log(`🗑️ [Repository] Rollback ejecutado: Partida ${matchId} eliminada.`);
    }


    /**
     * findById
     * Recupera una partida por su Primary Key.
     * Devuelve el objeto puro de la base de datos o null si no existe.
     */
    findById(id: string): MatchTypes.MatchRow | null {
		// 4. Preparamos la consulta de lectura
		// SELECT * es seguro aquí porque conocemos todas las columnas y no hay datos sensibles
        const stmt = this.db.prepare('SELECT * FROM matches WHERE id = ?');
        
		// 5. Ejecutamos obteniendo un solo resultado.
		// .get(): Optimizado para devolver 0 o 1 fila.
        const row = stmt.get(id);

        // 6. Retornamos con el tipado correcto
        return row ? (row as MatchTypes.MatchRow) : null;
	}
	
	/**
     * finishMatch
     * Cierra la partida escribiendo el ganador y los resultados finales.
     * Es crítico para la integridad histórica.
     */
	finishMatch(id: string, winnerId: string, p1Score: number, p2Score: number, finishedAt: number): void {
		try {
            // UPDATE con parámetros posicionales (?)
            const stmt = this.db.prepare(`
                UPDATE matches
                SET status = 'finished', 
                    winner_id = ?, 
                    player1_score = ?, 
                    player2_score = ?, 
                    finished_at = ?
                WHERE id = ?
            `);

            // .run() devuelve info sobre cambios (changes: 1 si funcionó)
            const result = stmt.run(winnerId, p1Score, p2Score, finishedAt, id);

            if (result.changes === 0) {
                console.warn(`⚠️ [Repo] finishMatch no encontró la partida ID: ${id}`);
            }

        } catch (error) {
            console.error(`❌ [Repo] Error actualizando finishMatch para ID ${id}:`, error);
        }
    }
}
