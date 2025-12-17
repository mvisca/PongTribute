//Este archivo es el que comunica directamente con la BD

import { MatchTypes } from '@transcendence/shared';
import { getDatabase } from '../connection.js';
import { randomUUID } from 'node:crypto'; // Usamos librería nativa de Node

export class MatchRepository {
	// 1. Obtenemos la conexión lista para usar y la guardamos para usarla
	// en los metodos de la clase sin tener que reconectar cada vez (porque
	//better-squlite3 trabaja de forma sincrona(bloqueante, pero rapidissima)
    private db = getDatabase();

    /**
     * Inserta (Low-level). Mantenemos tu método original pero lo hacemos privado
     * o lo dejamos público si lo usas en tests.
     */
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


	// --- MÉTODOS DE ALTO NIVEL PARA EL SERVICIO ---

    /**
     * Crea una partida pública lista para jugar (ACTIVE).
     * El Repo se encarga de generar ID, Fechas y Scores iniciales.
     */
    async createPublicMatch(player1Id: string, player2Id: string): Promise<MatchTypes.MatchRow> {
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
            // match_type: 'public' // TODO: Agregar columna a tu DB SQL si aún no existe
        };

        // Reusamos tu lógica de inserción
        this.create(newMatch);

        // Devolvemos el objeto completo (envuelto en Promise para compatibilidad)
        return newMatch; 
    }

    /**
     * Crea una partida privada en espera (PENDING).
     */
    async createPrivateMatch(hostId: string, guestId: string): Promise<MatchTypes.MatchRow> {
        const newMatch: MatchTypes.MatchRow = {
            id: randomUUID(),
            status: 'pending',
            player1_id: hostId,
            player1_score: 0,
            player2_id: guestId, // Ya asignamos el rival, aunque esté pending
            player2_score: 0,
            winner_id: null,
            created_at: Date.now(),
            finished_at: null,
            // match_type: 'private' // TODO: Agregar columna a tu DB
        };

        this.create(newMatch);
        return newMatch;
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
	 * Actualiza el resultado final de la partida.
	 */
	finishMatch(id: string, winnerId: string, p1Score: number, p2Score: number, finishedAt: number): void {
		this.db.prepare(`
			UPDATE matches
			SET status = 'finished', winner_id = ?, player1_score = ?, player2_score = ?, finished_at = ?
			WHERE id = ?
		`).run(winnerId, p1Score, p2Score, finishedAt, id);
	}

	
	//=====ESTE METODO CON REDIS YA NO LO VAMOS A USAR=====
	/**
     * MATCHMAKING SIMPLE (FIFO):
     * Busca la partida pública más antigua que esté en estado 'pending'
     * y que aún no tenga jugador 2.
     */
	findPendingPublicMatch(): MatchTypes.MatchRow | null {
		// 1. CONSULTA FIFO
        // SELECT * ... WHERE status = 'pending' AND player2_id IS NULL
        // ORDER BY created_at ASC (Dame la más vieja primero -> FIFO)
        // LIMIT 1 (Solo quiero una)
        const row = this.db.prepare(`
            SELECT * FROM matches 
            WHERE status = 'pending'  
            AND player2_id IS NULL
            ORDER BY created_at ASC
            LIMIT 1
        `).get(); // .get() devuelve UN objeto o undefined
		// 2. RETORNO SEGURO
        return row ? (row as MatchTypes.MatchRow) : null;
    }


	//=====ESTE METODO CON REDIS YA NO LO VAMOS A USAR=====
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

}