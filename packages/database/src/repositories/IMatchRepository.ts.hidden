import { MatchId, UserId } from "@transcendence/shared";
import * as MatchTypes from '@transcendence/shared';

/**
 * Interfaz que define el contrato para el repositorio de Match.\
 * Especifica QUÉ operaciones deben implementarse, sin definir CÓMO.\
 * \
 * Operaciones principales:\
 * - create(data)              → Crear nueva partida con 2 jugadores\
 * - findById(id)              → Buscar partida por ID\
 * - findByUser(userId)        → Buscar todas las partidas de un usuario\
 * - findActive()              → Buscar partidas en curso\
 * - finish(matchId, data)     → Finalizar partida con ganador y scores\
 * - updateScore(matchId, ...) → Actualizar score durante el juego\
 * \
 * Un Match siempre maneja:\
 * - 1 fila en tabla 'matches'\
 * - 2 filas en tabla 'match_participants' (1v1)\
 * \
 * Las operaciones deben ser transaccionales (ambas tablas o ninguna).
 */
export interface IMatchRepository {

	/**
	 * Crear partida con 2 jugadores\
	 * Inserta primero 2 rows en match_players y despues 1 row en matches\
	 * Transaccional (todo o nada)\
	 * @param data 2 players en formato TwoCreateMatchPlayer dentro de CreateMatchData\
	 * @returns Match con id completo en tipo Match
	 */
	create(data: MatchTypes.CreateMatchData): Promise<MatchTypes.Match>;
	
	/**
	 * Busca partida por id\
	 * Incluye 2 players\
	 * @param id de la partida\
	 * @returns Match con id completo en tipo Match 
	 */
	findById(matchId: MatchId): Promise<MatchTypes.Match | null>;

	/**
	 * Busca todas las partidas de un userId\
	 * Sin distinción MatchStatus\
	 * Ordenadas por fecha de creación (más recientes primero)
	 */
	findByUser(userId: UserId): Promise<MatchTypes.Match[]>;

	/**
	 * Busca todas las partidas activas\
	 * Ordenadas por fecha de creación (más recientes primero)
	 */
	findActive(): Promise<MatchTypes.Match[]>;

	/**
	 * Busca todas las partidas terminadas de un usuario\
	 * Ordenadas por fecha de creación (más recientes primero)
	 */
	findFinishedByUser(userId: UserId): Promise<MatchTypes.Match[]>;

	/**
	 * Finaliza una partida\
	 * Actualiza:\
	 * 	- winner_id\
	 * 	- finished_at\
	 *	- score\
	 * \
	 * @param matchId id de la partida\
	 * @param winnerId id del ganador\
	 * @param scores: objeto con resultado { userId: score, userId: score }\
	 * @returns match en formato Match
	 * @throws Erros si el matchno existe o ya está MATCH_STATS.FINISHED
	 */
	finish(matchId: MatchId): Promise<MatchTypes.Match>

	/**
	 * Actualiza score
	 * Bastante útil para actualizar score durante partida
	 * Puede usarse o guardar solo en memoria
	 */
	updateScore(
		matchId: MatchId, userId: UserId, score: number
	): Promise<void>;

	/**
	 * Borra partida
	 */
	delete(matchId: MatchId): Promise<void>;
}