import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../core/auth/AuthStore';
import { createMatch, leaveQueue, cancelMatch } from '../../game/api/gameApi';
import { GameConstants } from '@transcendence/shared/constants/game.constants.js';
import MatchSetup, { type ValidScore } from '../components/MatchSetup';
import MatchMaking from '../components/MatchMaking';
import FriendWaiting from '../components/FriendWaiting';
import { useMatchStore } from '../store/matchStore';
import { FriendsWidget } from '../../friends/components/FriendsWidget';
import { FEEDBACK_LOBBY_MS } from '../../../shared/constants/ui.constants';
import { AvatarDisplay, TimeoutBar } from '../../../shared/components/ui';

type MatchType = 'public' | 'local' | 'bot' | 'private';
type Step = 'menu' | 'setup' | 'matchmaking' | 'friend_setup' | 'friend_waiting';

export default function LobbyPage() {
    const { t } = useTranslation('lobby');
    const navigate = useNavigate();
    const token = useAuthStore(state => state.accessToken);

    const pendingEvent = useMatchStore(state => state.pendingEvent);
    const clearPendingEvent = useMatchStore(state => state.clearPendingEvent);

    const [step, setStep] = useState<Step>('menu');
    const [matchType, setMatchType] = useState<MatchType>('public');
    const [gameMode, setGameMode] = useState<GameConstants.GameModeType>('classic');
    const [targetScore, setTargetScore] = useState<ValidScore>(11);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [friendId, setFriendId] = useState('');
    const [friendUsername, setFriendUsername] = useState('');
    const [friendAvatar, setFriendAvatar] = useState('');
    const [pendingMatchId, setPendingMatchId] = useState('');

    const [friendRejected, setFriendRejected] = useState(false);
    const [friendExpired, setFriendExpired] = useState(false);
    const [queueExpired, setQueueExpired] = useState(false);

    const transitionTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    const clearTransitionTimer = () => {
        if (transitionTimer.current) {
            clearTimeout(transitionTimer.current);
            transitionTimer.current = undefined;
        }
    };

    const resetFeedbackStates = () => {
        setFriendRejected(false);
        setFriendExpired(false);
        setQueueExpired(false);
    };

    const [isSmallScreen, setIsSmallScreen] = useState(() => {
        const hasNoKeyboard = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        return window.innerWidth < 1024 || window.innerHeight < 600 || hasNoKeyboard;
    });

    useEffect(() => {
        const handleResize = () => {
            const hasNoKeyboard = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
            setIsSmallScreen(window.innerWidth < 1024 || window.innerHeight < 600 || hasNoKeyboard);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        return () => clearTransitionTimer();
    }, []);

    useEffect(() => {
        if (!pendingEvent) return;

        switch (pendingEvent.type) {
            case 'found':
            case 'started':
                clearPendingEvent();
                navigate(`/game/${pendingEvent.matchId}`);
                break;

            case 'queue_timeout':
                clearPendingEvent();
                break;

            case 'friend_rejected':
                clearPendingEvent();
                if (!friendRejected) handleFriendRejected();
                break;

            case 'friend_expired':
                clearPendingEvent();
                setPendingMatchId('');
                break;

            case 'friend_cancelled':
                clearPendingEvent();
                setPendingMatchId('');
                setStep('menu');
                break;
        }
    }, [pendingEvent, clearPendingEvent, navigate, friendUsername]);

    const handleMenuSelect = (type: MatchType) => {
        clearTransitionTimer();
        resetFeedbackStates();
        setMatchType(type);
        setError('');
        setStep('setup');
    };

    const handleStart = async (
        mode: GameConstants.GameModeType,
        targetScore: ValidScore
    ) => {
        if (!token) return;
        setGameMode(mode);
        setTargetScore(targetScore);
        setLoading(true);
        setError('');

        try {
            const result = await createMatch({ matchType, gameMode: mode, targetScore }, token);

            if ('outcome' in result && result.outcome === 'added_to_queue') {
                setStep('matchmaking');
                return;
            }

            if ('id' in result) {
                navigate(`/game/${result.id}`, {
                    state: { isLocal: matchType === 'local' }
                });
                return;
            }
        } catch (err: any) {
            setError(err?.message ?? t('failedToCreate'));
        } finally {
            setLoading(false);
        }
    };

    const handleCancelQueue = async () => {
        if (!token) return;
        clearTransitionTimer();
        resetFeedbackStates();
        try { await leaveQueue(token); } catch {}
        clearPendingEvent();
        setStep('setup');
    };

    const handlePlayBot = async () => {
        if (!token) return;
        clearTransitionTimer();
        resetFeedbackStates();
        setLoading(true);

        if (pendingMatchId) {
            try { await cancelMatch(pendingMatchId, token); } catch {}
            setPendingMatchId('');
        }

        if (step === 'matchmaking') {
            try { await leaveQueue(token); } catch {}
        }

        try {
            const result = await createMatch(
                { matchType: 'bot', gameMode, targetScore },
                token
            );

            if ('id' in result) {
                navigate(`/game/${result.id}`);
            }
        } catch (err: any) {
            setError(err?.message ?? t('failedToCreateBot'));
            setStep('menu');
        } finally {
            setLoading(false);
        }
    };

    const handleFriendChallenge = (id: string, username: string, avatar: string) => {
        clearTransitionTimer();
        resetFeedbackStates();
        setFriendId(id);
        setFriendUsername(username);
        setFriendAvatar(avatar);
        setMatchType('private');
        setError('');
        setStep('friend_setup');
    };

    const handleFriendStart = async (
        mode: GameConstants.GameModeType,
        score: ValidScore
    ) => {
        if (!token) return;
        setGameMode(mode);
        setTargetScore(score);
        setLoading(true);
        setError('');

        try {
            const result = await createMatch(
                { matchType: 'private', opponentId: friendId, gameMode: mode, targetScore: score },
                token
            );

            if ('id' in result) {
                setPendingMatchId(result.id);
                setStep('friend_waiting');
            }
        } catch (err: any) {
            setError(err?.message ?? t('failedToSendInvitation'));
        } finally {
            setLoading(false);
        }
    };

    const handleCancelInvite = async () => {
        if (!token) return;
        clearTransitionTimer();
        resetFeedbackStates();
        if (pendingMatchId) {
            try { await cancelMatch(pendingMatchId, token); } catch {}
            setPendingMatchId('');
        }
        setStep('menu');
    }

    const handleQueueExpired = () => {
        if (queueExpired) return;
        setQueueExpired(true);
        transitionTimer.current = setTimeout(() => {
            setQueueExpired(false);
            setStep('setup');
        }, FEEDBACK_LOBBY_MS);
    };

    const handleFriendExpired = () => {
        if (friendExpired) return;
        setFriendExpired(true);
        setPendingMatchId('');
        transitionTimer.current = setTimeout(() => {
            setFriendExpired(false);
            setStep('menu');
        }, FEEDBACK_LOBBY_MS);
    };

    const handleFriendRejected = () => {
        if (friendRejected) return;
        setFriendRejected(true);
        setPendingMatchId('');
        transitionTimer.current = setTimeout(() => {
            setFriendRejected(false);
            setStep('menu');
        }, FEEDBACK_LOBBY_MS);
    };

    const SETUP_TITLES: Record<MatchType, string> = {
        public:  t('onlineSettings'),
        local:   t('localSettings'),
        bot:     t('botSettings'),
        private: t('challengeSettings'),
    };

    const MENU_ITEMS: { type: MatchType; label: string }[] = [
        { type: 'public', label: t('playOnline') },
        { type: 'local',  label: t('localMatch') },
        { type: 'bot',    label: t('playVsBot') },
    ];

    const renderScreen = () => {
        switch (step) {
            case 'matchmaking':
                return (
                    <MatchMaking
                        gameMode={gameMode}
                        expired={queueExpired}
                        onExpired={handleQueueExpired}
                        onCancel={handleCancelQueue}
                        onPlayBot={handlePlayBot}
                    />
                );

            case 'friend_setup':
                return (
                    <MatchSetup
                        title={t('matchSettingsVs', { username: friendUsername.toUpperCase() })}
                        onStart={handleFriendStart}
                        onBack={() => setStep('menu')}
                        loading={loading}
                    />
                );

            case 'friend_waiting':
                return (
                    <FriendWaiting
                        friendUsername={friendUsername}
                        friendAvatar={friendAvatar}
                        rejectedBy={friendRejected ? friendUsername : undefined}
                        expired={friendExpired}
                        onExpired={handleFriendExpired}
                        onCancel={handleCancelInvite}
                        onPlayBot={handlePlayBot}
                    />
                );

            case 'setup':
                return (
                    <MatchSetup
                        title={SETUP_TITLES[matchType]}
                        onStart={handleStart}
                        onBack={() => setStep('menu')}
                        loading={loading}
                        fixedScore={matchType === 'public' ? 11 : undefined}
                    />
                );

            default:
                return (
                    <div className='w-full h-full flex flex-col items-center justify-center gap-8'>
                        <h1 className='text-2xl tracking-widest' style={{ textShadow: '0 0 10px #a855f7, 0 0 20px #a855f7, 0 0 40px #a855f7' }}>PONG🏓TRIBUTE</h1>
                        <div className='arcade-menu'>
                            {MENU_ITEMS.map(({ type, label }) => (
                                <button
                                    key={type}
                                    className='arcade-btn px-6 py-2 text-base'
                                    onClick={() => handleMenuSelect(type)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                )
        }
    };

    if (isSmallScreen) {
        return (
            <div className='retro-bg h-full flex flex-col items-center justify-center gap-6 px-8 text-center'>
                <p className='text-4xl'>🕹️</p>
                <p className='text-purple-200 text-lg'>{t('desktopRequired')}</p>
                <p className='text-purple-400 text-sm'>{t('desktopRequirements')}</p>
            </div>
        );
    }

    return (
        <div className='retro-bg h-full overflow-hidden relative flex items-center justify-center text-purple-100 min-w-[1150px]'>

            <div className='absolute top-4 left-4'>
                <FriendsWidget onPlayToFather={handleFriendChallenge} />
            </div>

            <div className='flex flex-col items-center gap-4 ml-46'>
                {error && (
                    <p className='text-red-400 text-sm'>{error}</p>
                )}
                <div className='arcade-screen'>
                    {renderScreen()}
                    <TimeoutBar
                        active={queueExpired || friendExpired || friendRejected}
                        durationMs={FEEDBACK_LOBBY_MS}
                    />
                </div>
            </div>

        </div>
    );
}