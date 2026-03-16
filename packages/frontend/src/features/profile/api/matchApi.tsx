import { apiRequest } from '../../../core/api/client';
import type { MatchTypes } from '@transcendence/shared/types/match.types.js';

const PAGE_SIZE = 10;

export async function getMatchHistory(
    userId: string,
    token: string,
    page = 0
): Promise<MatchTypes.Match[]> {
    const data = await apiRequest<{ matches: MatchTypes.Match[] }>(
        `/matches/history/${userId}?offset=${page * PAGE_SIZE}`,
        { method: 'GET', token }
    );
    return data.matches;
}

export { PAGE_SIZE };
