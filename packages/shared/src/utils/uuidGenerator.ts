import { randomUUID } from "crypto";
import * as SharedTypes from "@transcendence/shared";


export function generateEventId(): SharedTypes.EventId {
	return randomUUID() as SharedTypes.EventId;
}

export function generateUserId(): SharedTypes.UserId {
	return randomUUID() as SharedTypes.UserId;
}

export function generateMatchId(): SharedTypes.MatchId {
	return randomUUID() as SharedTypes.MatchId;
}

export function generateGameId(): SharedTypes.GameId {
	return randomUUID() as SharedTypes.GameId;
}

export function generateTournamentId(): SharedTypes.TournamentId {
	return randomUUID() as SharedTypes.TournamentId;
}