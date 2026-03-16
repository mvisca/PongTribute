import { apiRequest } from "../../../core/api/client";
import type { MatchSchemas, MatchTypes } from "@transcendence/shared";

export async function createMatch(
	body: MatchSchemas.CreateMatchBodyType,
	token: string
): Promise<MatchTypes.Match | { outcome: 'added_to_queue' }> {
	return apiRequest('/matches', {
		method: 'POST',
		body,
		token
	});
}

export async function leaveQueue(token: string) {
	return apiRequest('/matches/queue', {
		method: 'DELETE',
		token
	});
}