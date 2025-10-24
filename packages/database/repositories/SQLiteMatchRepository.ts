import Database from "better-sqlite3";
import { IMatchRepository } from "./IMatchRepository";
import { UserId, MatchId, generateMatchId } from "@transcendence/shared";
import * as MatchTypes from "@transcendence/shared"
import { MatchMapper } from "mappers/MatchMapper";
import { match } from "assert";

export class SQLiteMatchRepository implements IMatchRepository {
	
	constructor(private db: Database.Database) {}

	// ============================================================================
	// MÉTODOS PRIVADOS
	// ============================================================================

	/**
	 * Recupera una row de 'matches' por matchId
	 */
	private getMatchRow(matchId: MatchId): MatchTypes.MatchRow | null {
		const row = this.db
			.prepare('SELECT * FROM matches WHERE id = ?')
			.get(matchId);
		return row ? row as MatchTypes.MatchRow : null;
	}
	
	/**
	 * Recupera los 'match_players' de un 'match'
	 */
	private getPlayerRows(matchId: MatchId): MatchTypes.MatchPlayerRow[] {
		const rows = this.db
			.prepare('SELECT * FROM match_players WHERE match_id = ?')
			.all(matchId);
		return rows as MatchTypes.MatchPlayerRow[];
	}
	
	/**
	 * Monta un objeto Match completo (Match + Players)
	 */
	private getCompleteMatch(matchId: MatchId): MatchTypes.Match | null {
		const matchRow = this.getMatchRow(matchId);
		if (!matchRow) return null;
		
		const playerRows = this.getPlayerRows(matchId);
		
		if (playerRows.length !== 2) {
			throw new Error(`Match ${matchId} tiene ${playerRows.length} players (esperados: 2)`);
		}
		return MatchMapper.rowToMatch(matchRow, playerRows);
	}

	// ============================================================================
	// CREAR
	// ============================================================================

	/**
	 * Crea un nuevo record 'match' y sus dos 'players'\
	 * Se transacción para asegurar consistencia de db, todo o nada
	 */
	async create(data: MatchTypes.CreateMatchData): Promise<MatchTypes.MatchResponse> {
		const match = MatchMapper.createDataToMatch(data);
		const matchRow = MatchMapper.matchToRow(match);
		const playerRows = match.players.map(MatchMapper.matchPlayerToRow);

		const transaction = this.db.transaction(() => {
			// Insertar partida
			this.db.prepare(`
				INSERT INTO matches (id, status, winner_id, created_at)
				VALUES (?, ?, ?, ?)
			`).run(matchRow.id, matchRow.status, matchRow.winner_id, matchRow.created_at);
			
			// Prepara para insertar players 
			const insertPlayer = this.db.prepare(`
				INSERT INTO match_players (match_id, user_id, player_slot, player_position, score)
				VALUES (?, ?, ?, ?, ?)
			`);

			// Aqui los inserta iterando
			playerRows.forEach(player =>
				insertPlayer.run(
					player.match_id,
					player.user_id,
					player.player_slot,
					player.player_position,
					player.score
				)
			);
		});

		transaction();

		const createdMatch = this.getCompleteMatch(match.id);
		if (!createdMatch) throw new Error(`No se pudo crear match: ${match.id}`);

		return MatchMapper.matchToResponse(createdMatch);
	}

	// ============================================================================
	// CONSULTAS
	// ============================================================================

	/**
	 * Busca un match completo por su 'matchId'
	 */
	async findById(matchId: MatchId): Promise<MatchTypes.MatchResponse | null> {
		const match = this.getCompleteMatch(matchId);
		if (match === null)
			throw new Error(`Match con id ${matchId} no existe`);
		return match as MatchTypes.MatchResponse;
	}

	/**
	 * Busca todos los 'matches' del 'userId'\
	 * Response ordenada descendente
	 */
	async findByUser(userId: UserId): Promise<MatchTypes.MatchResponse[]> {
		const matchIds = this.db
			.prepare(`
				SELECT DISTINCT match_id
				FROM match_players
				WHERE user_id = ?
			`)
			.all(userId)
			.map((row: any) => row.match_id as MatchId);

		const matches: MatchTypes.Match[] = [];
		for (const matchId of matchIds) {
			const match = this.getCompleteMatch(matchId);
			if (match) matches.push(match);
		}

		matches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
		return matches.map(MatchMapper.matchToResponse);
	}

	/**
	 * Devuelve 'matches' con 'status = ACTIVE'\
	 * Response ordenada desc
	 */
	async findActive(): Promise<MatchTypes.MatchResponse[]> {
		const matchRows = this.db
			.prepare(`
				SELECT * FROM matches
				WHERE status = ?
				ORDER BY created_at DESC
			`)
			.all(MatchTypes.MATCH_STATUS.ACTIVE) as MatchTypes.MatchRow[];

		const matches: MatchTypes.Match[] = [];
		for (const matchRow of matchRows) {
			const playerRows = this.getPlayerRows(matchRow.id as MatchId);
			if (playerRows.length === 2) {
				matches.push(MatchMapper.rowToMatch(matchRow, playerRows));
			}
		}
		return matches.map(MatchMapper.matchToResponse);
	}

	/**
	 * Devuelve 'matches' finalizados de 'userId'\
	 * Response ordenado desc
	 */
	async findFinishedByUser(userId: UserId): Promise<MatchTypes.MatchResponse[]> {
		const matchIdRows = this.db
			.prepare(`
				SELECT DISTINCT match_id
				FROM match_players
				WHERE user_id = ?
			`)
			.all(userId);

		const matchIds = matchIdRows.map((row: any) => row.match_id as MatchId);

		const finishedMatches: MatchTypes.Match[] = [];
		for (const id of matchIds) {
			const matchRow = this.getMatchRow(id);
			if (matchRow && matchRow.status === MatchTypes.MATCH_STATUS.FINISHED) {
				const match = this.getCompleteMatch(id);
				if (match) finishedMatches.push(match);
			}
		}

		finishedMatches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
		return finishedMatches.map(MatchMapper.matchToResponse);
	}

	// ============================================================================
	// ACTUALIZACIÓN Y FINALIZACIÓN
	// ============================================================================

	/**
	 * Marca un 'match' como status = FINISHED\
	 * Guarda el ganador y actualiza los puntajes\
	 * Usa transaction, todo o nada
	 */
	async finish(
		matchId: MatchId,
		winnerId: UserId,
		scores: { [key: string]: number }
	): Promise<MatchTypes.MatchResponse> {

		const match = this.getCompleteMatch(matchId);
		if (!match) throw new Error(`El match no existe: ${matchId}`);
		if (match.status === MatchTypes.MATCH_STATUS.FINISHED)
			throw new Error(`Match ${matchId} ya está finalizado`);

		const transaction = this.db.transaction(() => {
			this.db.prepare(`
				UPDATE matches
				SET status = ?, winner_id = ?
				WHERE id = ?
			`).run(MatchTypes.MATCH_STATUS.FINISHED, winnerId, matchId);
	
			const updateScore = this.db.prepare(`
				UPDATE match_players
				SET score = ?
				WHERE match_id = ? AND user_id = ? 
			`);

			for (const [userId, score] of Object.entries(scores)) {
				updateScore.run(score, matchId, userId);
			}
		});

		transaction();
		
		const finishedMatch = this.getCompleteMatch(matchId);
		if (!finishedMatch)
			throw new Error(`Fallo al recuperar el match terminado: ${matchId}`);

		return MatchMapper.matchToResponse(finishedMatch);
	}

	/**
	 * Actualiza el puntaje de un 'player' de un 'matchId'
	 */
	async updateScore(matchId: MatchId, userId: UserId, score: number): Promise<void> {
		this.db
			.prepare(`
				UPDATE match_players
				SET score = ?
				WHERE match_id = ? AND user_id = ?
			`).run(score, matchId, userId);
	}

	// ============================================================================
	// ELIMINAR
	// ============================================================================

	/**
	 * Elimina un 'match'\
	 * Los 'players' asociados se eliminan también (CASCADE del tables.sql)
	 */
	async delete(matchId: MatchId): Promise<void> {
		this.db.prepare(`DELETE FROM matches WHERE id = ?`).run(matchId);
	}
}