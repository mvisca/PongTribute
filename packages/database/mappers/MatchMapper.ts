import * as SharedTypes from '@transcendence/shared';
import { MATCH_STATUS } from '@transcendence/shared';
import { pbkdf2, pseudoRandomBytes } from 'crypto';
import { create } from 'domain';
import { stat } from 'fs';

export class MatchMapper {

	// DTO OUT Player
	static rowToMatchPlayer(playerRow: SharedTypes.MatchPlayerRow): SharedTypes.MatchPlayer {
		const player = {
			matchId: playerRow.match_id as SharedTypes.MatchId,
			userId: playerRow.user_id as SharedTypes.UserId,
			playerSlot: playerRow.player_slot as SharedTypes.PlayerSlot,
			playerPosition: playerRow.player_position as SharedTypes.PlayerPosition,
			score: playerRow.score 
		};

		return player;
	}

	//DTO OUT Match from database a Domain
	static rowToMatch(
		matchRow: SharedTypes.MatchRow,
		playerRows: SharedTypes.MatchPlayerRow[]
	): SharedTypes.Match {

		if (playerRows.length !== 2) {
			throw new Error(`Match debe tener 2 jugadores, recibidos: ${playerRows.length}`);
		}

		const player1 = this.rowToMatchPlayer(playerRows[0]);
		const player2 = this.rowToMatchPlayer(playerRows[1]);
		const players: SharedTypes.MatchPlayers = [player1, player2];

		const match = {
			id: matchRow.id as SharedTypes.MatchId,
			status: matchRow.status as SharedTypes.MatchStatus,
			winnerId: matchRow.winner_id ? (matchRow.winner_id as SharedTypes.UserId) : null,
			createdAt: new Date(matchRow.created_at),
			players
		} as SharedTypes.Match;
		return match;
	}

	// DTO IN Match domain to SQL
	static matchToRow(match: SharedTypes.Match): SharedTypes.MatchRow {
		const row: SharedTypes.MatchRow = {
			id: match.id,
			status: match.status,
			winner_id: match.winnerId,
			created_at: match.createdAt.getTime()
		}
		return row;
	}

	// DTO IN Player domain to SQL
	static matchPlayerToRow(player: SharedTypes.MatchPlayer): SharedTypes.MatchPlayerRow {
		const row: SharedTypes.MatchPlayerRow = {
			match_id: player.matchId,
			user_id: player.userId,
			player_slot: player.playerSlot,
			player_position: player.playerPosition,
			score: player.score
		}
		return row;
	}

	// Compone Data de Match y Data de players en un data de Match
	static createDataToMatch(data: SharedTypes.CreateMatchData): SharedTypes.Match {
		const matchId = SharedTypes.generateMatchId();
		const now = new Date();

		const matchPlayers: SharedTypes.MatchPlayers = [
			{
				matchId: matchId,
				userId: data[0].userId,
				playerPosition: data[0].playerPosition,
				playerSlot: data[0].playerSlot,
				score: 0
			},
			{
				matchId: matchId,
				userId: data[1].userId,
				playerPosition: data[1].playerPosition,
				playerSlot: data[1].playerSlot,
				score: 0
			}
		];

		const match: SharedTypes.Match = {
			id: matchId,
			status: MATCH_STATUS.ACTIVE,
			winnerId: null,
			players: matchPlayers,
			createdAt: now
		}

		return match;
	}

	/**
	 * Crea el array de players necesario para crear el Match\
	 * @param p1id el player1\
	 * @param p2id el player2\
	 * @returns Array de tipo CreatePlayerData[] => [CreatePlayerData, CreatePlayerData]\
	 * CreatePlayerData es una estructura mínima previa de MatchPlayer, sin score ni matchId
	 */
	static cretateMatchPlayers(
		p1id: SharedTypes.UserId, p2id: SharedTypes.UserId
	): SharedTypes.CreateMatchData {
		return ([
			{
				userId: p1id,
				playerPosition: "left",
				playerSlot: "player1"
			},
			{
				userId: p2id,
				playerPosition: "right",
				playerSlot: "player2"
			}
		]);
	}

	/**
	 * Extrae players de Match como array tipado\
	 * Útil para iteracionesque pierden tipo de tupla\
	 * Por ejemplo... currentMatch.players.forEach(p => ...); \
	 * Aquí 'p' pierde el tipado\
	 * Mejor usar esta funcion para obtener un array de los players\
	 * @param match Match completo
	 * @returns Array de tipo MatchPlayer[] o undefined si no existe
	 */
	static getPlayersArray(match: SharedTypes.Match): SharedTypes.MatchPlayer[] {
		return [...match.players];
	}

	/**
	 * Encuentra un player específico en el match
	 * @param match Match completo
	 * @param userId del usuario que se busca del match
	 * @return MatchPlayer o undefined si no existe
	 */
	static findPlayerInMatch(
		match: SharedTypes.Match, userId: SharedTypes.UserId
	): SharedTypes.MatchPlayer | undefined {
		const players = this.getPlayersArray(match);
		return players.find(p => p.userId === userId);
	}
	

	// Fin de clase
}