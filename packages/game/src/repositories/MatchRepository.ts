//Este archivo es el que comunica directamente con la BD

import { MatchTypes } from '@transcendence/shared';
import { getDatabase } from '../connection.js';

export class MatchRepository {
	// 1. Obtenemos la conexión lista para usar y la guardamos para usarla
	// en los metodos de la clase sin tener que reconectar cada vez (porque
	//better-squlite3 trabaja de forma sincrona(bloqueante, pero rapidissima)
    private db = getDatabase();

    /**
     * Inserta una nueva partida en la base de datos.
     * Recibe el objeto 'MatchRow' que ya preparó el Servicio con todos los datos.
     */
    create(match: MatchTypes.MatchRow): void {
        // 2. Preparamos la sentencia SQL (Query)
        const stmt = this.db.prepare(`
            INSERT INTO matches (
                id, status, player1_id, player1_score, player2_id, player2_score, 
                winner_id, created_at, finished_at
            ) VALUES (
                @id, @status, @player1_id, @player1_score, @player2_id, @player2_score,
                @winner_id, @created_at, @finished_at
            )
        `);
		//@id le dice a SQLite: "Aquí irá un valor que buscaré con 
		// la clave id en el objeto que me pases".

        // 3. Ejecutamos la sentencia y better-sqlite3 inyecta las
		// propiedades del objeto recibido como argumento (contiene
		// valores como match.id, match.status, etc).
		// run(): se usa para INSERT, UPDATE, DELETE (operaciones que 
		// no devuelven datos, solo cambian cosas).
        stmt.run(match);
    }

    /**
     * Busca una partida por su ID único.
     * Devuelve el objeto puro de la base de datos o null si no existe.
     */
    findById(id: string): MatchTypes.MatchRow | null {
		// 4. Preparamos la consulta de lectura
		// El signo "?": Parametro Posicional. El primer ? corresponde al
		// primer argumento que pasamos al ejecutar 
        const stmt = this.db.prepare('SELECT * FROM matches WHERE id = ?');
        
		// 5. Ejecutamos obteniendo un solo resultado (.get)
		//get(): Se usa para SELECT cuando esperas una sola fila
		// (o ninguna). Devuelve el objeto encontrado o undefined.
		// Si esperamos muchas filas usaremos all().
        const row = stmt.get(id);

        // 6. Retornamos con el tipado correcto
        return row ? (row as MatchTypes.MatchRow) : null;
    }

	/**
     * MATCHMAKING SIMPLE (FIFO):
     * Busca la partida pública más antigua que esté en estado 'pending'
     * y que aún no tenga jugador 2.
     */
    findPendingPublicMatch(): MatchTypes.MatchRow | null {
        const row = this.db.prepare(`
            SELECT * FROM matches 
            WHERE status = 'pending'  
            AND player2_id IS NULL
            ORDER BY created_at ASC
            LIMIT 1
        `).get();
        return row ? (row as MatchTypes.MatchRow) : null;
    }

    /**
     * Une al Jugador 2 a una partida existente.
     * Cambia el estado a 'active'.
     */
    joinMatch(matchId: string, player2Id: string): void {
        const result = this.db.prepare(`
            UPDATE matches 
            SET player2_id = ?, status = 'active'
            WHERE id = ? AND status = 'pending'
        `).run(player2Id, matchId);
        
        // Verificamos si realmente se actualizó algo (changes > 0)
        if (result.changes === 0) {
            throw new Error(`No se pudo unir a la partida ${matchId} (quizás ya no está pendiente o no existe)`);
        }
    }

    /**
     * Actualiza el resultado final de la partida.
     */
    finishMatch(id: string, winnerId: string, p1Score: number, p2Score: number, finishedAt: number): void {
        this.db.prepare(`
            UPDATE matches
            SET status = 'finished', winner_id = ?, player1_score = ?, player2_score = ?, finished_at = ?
            WHERE id = ?
        `).run(winnerId, p1Score, p2Score, finishedAt, id);
    }
}