import { apiRequestWithRefresh } from '../../../core/api/apiInterceptor';
import type { MatchTypes } from '@transcendence/shared/types/match.types.js';

const PAGE_SIZE = 6;

export async function getMatchHistory(
    userId: string,
    token: string,
    page = 0
): Promise<MatchTypes.Match[]> {
	const data = await apiRequestWithRefresh<{ matches: MatchTypes.Match[] }>(
        `/matches/history/${userId}?offset=${page * PAGE_SIZE}&limit=${PAGE_SIZE}`,
        { method: 'GET', token }
    );
    return data.matches;
}

export { PAGE_SIZE };
