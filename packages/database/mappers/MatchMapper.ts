import * as SharedTypes from '@transcendence/shared';
import { MATCH_STATUS } from '@transcendence/shared';
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

		const players = playerRows.map(row =>
			this.rowToMatchPlayer(row)
		) as SharedTypes.TwoMatchPlayers;

		const match = {
			id: matchRow.id as SharedTypes.MatchId,
			status: matchRow.status as SharedTypes.MatchStatus,
			winnerId: matchRow.winner_id ? (matchRow.winner_id as SharedTypes.UserId) : null,
			createdAt: new Date(matchRow.created_at),
			players
		} as SharedTypes.Match;
		return match;
	}

	static matchToResponse(match: SharedTypes.Match): SharedTypes.MatchResponse {
		return {...match};
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

	// DTO IN Data to Match
	static createDataToMatch(data: SharedTypes.CreateMatchData): SharedTypes.Match {
		const matchId = SharedTypes.generateMatchId();
		const now = new Date();

		const players: SharedTypes.TwoMatchPlayers = data.players.map(playerData => ({
			matchId,
			userId: playerData.userId,
			playerSlot: playerData.playerSlot,
			playerPosition: playerData.playerPosition,
			score: 0
		})) as SharedTypes.TwoMatchPlayers;

		const match: SharedTypes.Match = {
			id: matchId,
			status: MATCH_STATUS.ACTIVE,
			winnerId: null,
			players: players,
			createdAt: now
		}

		return match;
	}

	// Fin de clase
}