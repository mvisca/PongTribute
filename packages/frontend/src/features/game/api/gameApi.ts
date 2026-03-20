import { apiRequestWithRefresh } from "../../../core/api/apiInterceptor";
import type { MatchSchemas, MatchTypes } from "@transcendence/shared";

export async function createMatch(
	body: MatchSchemas.CreateMatchBodyType,
	token: string
): Promise<MatchTypes.Match | { outcome: 'added_to_queue' }> {
	return apiRequestWithRefresh('/matches', {
		method: 'POST',
		body,
		token,
	});
}

export async function leaveQueue(token: string):  Promise<void> {
	return apiRequestWithRefresh('/matches/queue', {
		method: 'DELETE',
		token,
	});
}

export async function cancelMatch(matchId: string, token: string): Promise<void> {
	return apiRequestWithRefresh(`/matches/${matchId}`, {
		method: 'DELETE',
		token,
	});
}

export async function acceptMatch(matchId: string, token: string): Promise<MatchTypes.Match> {
	return apiRequestWithRefresh(`/matches/${matchId}/accept`, {
		method: 'POST',
		token,
	});
}

export async function rejectMatch(matchId: string, token: string): Promise<MatchTypes.Match> {
	return apiRequestWithRefresh(`/matches/${matchId}/reject`, {
		method: 'POST',
		token,
	});
}