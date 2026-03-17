import { apiRequestWithRefresh } from "../../../core/api/apiInterceptor";
import type { MatchSchemas, MatchTypes } from "@transcendence/shared";

export async function createMatch(
	body: MatchSchemas.CreateMatchBodyType,
	token: string
): Promise<MatchTypes.Match | { outcome: 'added_to_queue' }> {
	return apiRequestWithRefresh('/matches', {
		method: 'POST',
		body,
		token
	});
}

export async function leaveQueue(token: string) {
	return apiRequestWithRefresh('/matches/queue', {
		method: 'DELETE',
		token
	});
}