import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../core/auth/AuthStore';
import { getMatchHistory, PAGE_SIZE } from '../../profile/api/matchApi';
import type { MatchTypes } from '@transcendence/shared/types/match.types.js';
import {
    PageContainer,
    FormCard,
    LinkButton,
    AlertError,
    LoadingScreen,
} from '../../../shared/components/ui';

export default function HistoryPage() {
    const navigate    = useNavigate();
    const userId      = useAuthStore((state) => state.user?.id);
    const token       = useAuthStore((state) => state.accessToken);

    const [matches,  setMatches]  = useState<MatchTypes.Match[]>([]);
    const [page,     setPage]     = useState(0);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState('');
    const [hasMore,  setHasMore]  = useState(true);

    useEffect(() => {
        if (!userId || !token) return;
        const fetch = async () => {
            setLoading(true);
            setError('');
            try {
                const data = await getMatchHistory(userId, token, page);
                setMatches(data);
                setHasMore(data.length === PAGE_SIZE);
            } catch {
                setError('Failed to load match history');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [userId, token, page]);

    if (loading) return <LoadingScreen />;

    return (
        <PageContainer>
            <FormCard title='HISTORY'>

                <AlertError message={error} />

                {matches.length === 0 ? (
                    <p className='text-sm text-purple-400 text-center py-4'>
                        No matches found
                    </p>
                ) : (
                    <div className='flex flex-col gap-2 mt-2'>
                        {matches.map((match) => {
                            const me    = match.player1.userId === userId ? match.player1 : match.player2;
                            const rival = match.player1.userId === userId ? match.player2 : match.player1;
                            const won   = match.winnerId === userId;

                            return (
                                <div
                                    key={match.id}
                                    className={`rounded-lg px-4 py-3 text-sm border ${
                                        won
                                        ? 'border-green-700 bg-green-950/30'
                                        : 'border-red-900 bg-red-950/20'
                                    }`}
                                >
                                    <div className='flex justify-between items-center'>
                                        <span className={won ? 'text-green-400' : 'text-red-400'}>
                                            {won ? 'WIN' : 'LOSS'}
                                        </span>
                                        <span className='text-purple-300 tracking-widest'>
                                            {me?.score ?? 0} — {rival?.score ?? 0}
                                        </span>
                                        <span className='text-white text-xs'>
                                            {rival?.username ?? 'Unknown'}
                                        </span>
                                    </div>
                                    <div className='flex justify-between mt-1 text-xs text-purple-600'>
                                        <span>{match.gameMode}</span>
                                        <span>
                                            {new Date(match.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
				)}
				
                {/* Paginación */}
                <div className='flex justify-between items-center mt-6'>
                    <LinkButton
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                    >
                        ← PREV
                    </LinkButton>
                    <span className='text-sm text-purple-500'>
                        Page {page + 1}
                    </span>
                    <LinkButton
                        onClick={() => setPage((p) => p + 1)}
                        disabled={!hasMore}
                    >
                        NEXT →
                    </LinkButton>
                </div>

                <div className='mt-6 text-right'>
                    <LinkButton onClick={() => navigate('/profile')}>
                        ← Back to profile
                    </LinkButton>
                </div>


            </FormCard>
        </PageContainer>
    );
}