import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../core/auth/AuthStore';
import { useGameSocket } from '../hooks/useGameSocket';
import { useMatchStore } from '../../../features/lobby/store/matchStore';
import { renderGame } from '../renderer/gameRender';
import { GameConstants } from '@transcendence/shared/constants/game.constants.js';
import { FriendsWidget } from '../../friends/components/FriendsWidget';
import { AvatarDisplay, TimeoutBar } from '../../../shared/components/ui';
import { FEEDBACK_LOBBY_MS } from '../../../shared/constants/ui.constants';

const { GAME_ACTION, PLAYER_SIDE } = GameConstants;

export default function GamePage() {
    const { t } = useTranslation('game');
    const { t: tLobby } = useTranslation('lobby');
    const { t: tCommon } = useTranslation('common');
    const { matchId } = useParams<{ matchId: string }>();
    const navigate = useNavigate();
    const currentUserId = useAuthStore(state => state.user?.id);
    const currentUsername = useAuthStore(state => state.user?.username);
    const currentAvatar = useAuthStore(state => state.avatar);

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

    const { status, matchInfo, gameOver, waitSeconds, error, gameStateRef, sendAction, disconnect } = useGameSocket(matchId!);

    const setActiveMatchId = useMatchStore(s => s.setActiveMatchId);
    const clearActiveMatchId = useMatchStore(s => s.clearActiveMatchId);

    const [confirmingForfeit, setConfirmingForfeit] = useState(false);
    const [disconnectCountdown, setDisconnectCountdown] = useState<number>(0);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number>(0);

    const location = useLocation();
    const isLocal = (location.state as { isLocal?: boolean } | null)?.isLocal ?? false;

    const isPlayer1 = matchInfo ? matchInfo.playerSide === 'left' : true;

    const keysDown = useRef(new Set<string>());

    const handleForfeitClick = useCallback(() => {
        setConfirmingForfeit(true);
    }, []);

    const handleForfeitConfirm = useCallback(() => {
        disconnect();
        clearActiveMatchId();
        navigate('/home');
    }, [disconnect, clearActiveMatchId, navigate]);

    const handleForfeitCancel = useCallback(() => {
        setConfirmingForfeit(false);
    }, []);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (keysDown.current.has(e.key)) return;

        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        keysDown.current.add(e.key);

        if (isLocal) {
            switch (e.key) {
                case 'w': case 'W': sendAction(GAME_ACTION.MOVE_UP, PLAYER_SIDE.LEFT); break;
                case 's': case 'S': sendAction(GAME_ACTION.MOVE_DOWN, PLAYER_SIDE.LEFT); break;
                case 'ArrowUp': sendAction(GAME_ACTION.MOVE_UP, PLAYER_SIDE.RIGHT); e.preventDefault(); break;
                case 'ArrowDown': sendAction(GAME_ACTION.MOVE_DOWN, PLAYER_SIDE.RIGHT); e.preventDefault(); break;
                case ' ': e.preventDefault(); sendAction(GAME_ACTION.PAUSE_TOGGLE); break;
            }
        } else {
            switch (e.key) {
                case 'w': case 'W': case 'ArrowUp': sendAction(GAME_ACTION.MOVE_UP); e.preventDefault(); break;
                case 's': case 'S': case 'ArrowDown': sendAction(GAME_ACTION.MOVE_DOWN); e.preventDefault(); break;
            }
        }
    }, [isLocal, sendAction]);

    const handleKeyUp = useCallback((e: KeyboardEvent) => {
        keysDown.current.delete(e.key);

        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        if (isLocal) {
            if (['w', 'W', 's', 'S'].includes(e.key)) {
                const hasUp = keysDown.current.has('w') || keysDown.current.has('W');
                const hasDown = keysDown.current.has('s') || keysDown.current.has('S');

                if (hasUp) {
                    sendAction(GAME_ACTION.MOVE_UP, PLAYER_SIDE.LEFT);
                } else if (hasDown) {
                    sendAction(GAME_ACTION.MOVE_DOWN, PLAYER_SIDE.LEFT);
                } else {
                    sendAction(GAME_ACTION.STOP, PLAYER_SIDE.LEFT);
                }
            }

            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                const hasUp = keysDown.current.has('ArrowUp');
                const hasDown = keysDown.current.has('ArrowDown');

                if (hasUp) {
                    sendAction(GAME_ACTION.MOVE_UP, PLAYER_SIDE.RIGHT);
                } else if (hasDown) {
                    sendAction(GAME_ACTION.MOVE_DOWN, PLAYER_SIDE.RIGHT);
                } else {
                    sendAction(GAME_ACTION.STOP, PLAYER_SIDE.RIGHT);
                }
            }
        } else {
            if ([ 'w', 'W', 's', 'S', 'ArrowUp', 'ArrowDown' ].includes(e.key)) {
                const hasUp = keysDown.current.has('w') || keysDown.current.has('W') || keysDown.current.has('ArrowUp');
                const hasDown = keysDown.current.has('s') || keysDown.current.has('S') || keysDown.current.has('ArrowDown');

                if (hasUp) {
                    sendAction(GAME_ACTION.MOVE_UP);
                } else if (hasDown) {
                    sendAction(GAME_ACTION.MOVE_DOWN);
                } else {
                    sendAction(GAME_ACTION.STOP);
                }
            }
        }
    }, [isLocal, sendAction]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [handleKeyDown, handleKeyUp]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        function frame() {
            const gs = gameStateRef.current;
            if (gs && canvas && ctx) {
                renderGame(ctx, gs, canvas.width, canvas.height);
            }
            animRef.current = requestAnimationFrame(frame);
        }

        animRef.current = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(animRef.current);
    }, [gameStateRef]);

    useEffect(() => {
        if (matchId) setActiveMatchId(matchId);
    }, [matchId, setActiveMatchId]);

    useEffect(() => {
        if (status === 'finished' || status === 'error') {
            clearActiveMatchId();
        }
    }, [status, clearActiveMatchId]);

    useEffect(() => {
        if (status !== 'finished') return;
        const timer = setTimeout(() => navigate('/home'), FEEDBACK_LOBBY_MS);
        return () => clearTimeout(timer);
    }, [status, navigate]);

    useEffect(() => {
        if (status !== 'opponent_disconnected') return;

        setDisconnectCountdown(waitSeconds);

        const interval = setInterval(() => {
            setDisconnectCountdown(s => Math.max(0, s - 1));
        }, 1000);

        return () => clearInterval(interval);
    }, [status, waitSeconds]);

    const renderOverlay = () => {
        switch (status) {
            case 'connecting':
                return <Overlay>{t('connecting')}</Overlay>;

            case 'joined':
                return (
                    <Overlay>
                        <p className='text-lg'>{t('vs', { opponent: matchInfo?.opponentUsername })}</p>
                        <p className='text-sm text-purple-400 mt-2'>{t('waitingForStart')}</p>
                    </Overlay>
                );

            case 'countdown':
                return (
                    <div className='absolute inset-0 bg-black/60 flex flex-col items-center justify-center rounded-lg pointer-events-none z-50'>
                        <span className='text-[10rem] font-extrabold text-white animate-pulse drop-shadow-[0_0_20px_rgba(168,85,247,0.8)]'>
                            {gameStateRef.current?.countdownValue}
                        </span>
                    </div>
                );

            case 'opponent_disconnected':
                return (
                    <Overlay>
                        <p className='text-lg'>{t('opponentDisconnected')}</p>
                        <p className='text-base text-yellow-500 mt-2'>
                            {t('waitingReconnection', { seconds: disconnectCountdown })}
                        </p>
                    </Overlay>
                )

            case 'paused':
                return (
                    <div className='absolute inset-0 bg-black/60 flex flex-col items-center justify-center rounded-lg z-50'>
                        <span className='text-5xl font-extrabold text-white drop-shadow-[0_0_20px_rgba(168,85,247,0.8)]'>
                            {t('paused')}
                        </span>
                        <p className='text-yellow-500 text-base mt-4'>{t('pressSpaceToResume')}</p>
                    </div>
                );

            case 'finished':
                const won = gameOver?.winnerId === currentUserId;
                const winnerText = isLocal
                    ? t('matchFinished')
                    : (won ? t('youWin') : t('youLose'));
                return (
                    <Overlay>
                        <p className='text-4xl font-extrabold mb-6'
                            style={{ textShadow: '0 0 10px #a855f7, 0 0 20px #a855f7, 0 0 40px #a855f7' }}>
                             {winnerText}
                        </p>
                        <p className='text-3xl mb-8'
                            style={{ textShadow: '0 0 10px #a855f7, 0 0 20px #a855f7' }}>
                             {gameOver?.player1Score} - {gameOver?.player2Score}
                        </p>
                        <button className='arcade-btn px-6 py-2 text-base' onClick={() => navigate('/home')}>
                            {t('backToLobby')}
                        </button>
                    </Overlay>
                );

            case 'error':
                return (
                    <Overlay>
                        <p className='text-base text-red-500 mb-4'>{error || tCommon('connectionLost')}</p>
                        <button className='arcade-btn px-6 py-2 text-base' onClick={() => navigate('/home')}>
                            {t('backToLobby')}
                        </button>
                    </Overlay>
                );

            default:
                return null;
        }
    };

    if (isSmallScreen) {
        return (
            <div className='retro-bg h-full flex flex-col items-center justify-center gap-6 px-8 text-center'>
                <span className='text-6xl'>🕹️</span>
                <h2 className='text-xl text-purple-200'>{t('desktopRequired')}</h2>
                <p className='text-sm text-purple-400'>
                    {t('desktopExplanation')}
                </p>
                <button
                    className='arcade-btn px-6 py-2 text-sm'
                    onClick={() => navigate('/home')}
                >
                    {t('backToLobby')}
                </button>
            </div>
        );
    }

    return (
        <div className='retro-bg h-full overflow-hidden relative flex items-center justify-center min-w-[1150px]'>
            <div className='absolute top-4 left-4'>
                <FriendsWidget />
            </div>

            <div className='flex flex-col items-center gap-8 ml-46'>
                {matchInfo && (
                    <div className='flex items-center justify-center gap-80 w-[780px] mb-[-8px] z-10'>
                        <div className='flex items-center gap-2'>
                            <AvatarDisplay src={isPlayer1 ? (currentAvatar ?? '') : matchInfo.opponentAvatar} size='sm' />
                            <span className='text-purple-200 text-base'>
                                {isPlayer1 ? currentUsername : matchInfo.opponentUsername}
                            </span>
                        </div>
                        <div className='flex items-center gap-2 flex-row-reverse'>
                            <AvatarDisplay src={isPlayer1 ? matchInfo.opponentAvatar : (currentAvatar ?? '')} size='sm' />
                            <span className='text-purple-200 text-base'>
                                {isPlayer1 ? matchInfo.opponentUsername : currentUsername}
                            </span>
                        </div>
                    </div>
                )}

                {/* Canvas */}
                <div className='arcade-screen relative'>
                    <canvas
                        ref={canvasRef}
                        width={780}
                        height={480}
                        className='w-full h-full rounded-lg'
                    />
                    {renderOverlay()}
                    <TimeoutBar
                        active={status === 'finished'}
                        durationMs={FEEDBACK_LOBBY_MS}
                    />
                </div>

                {/* Forfeit button */}
                {(status === 'playing' || status === 'paused' || status === 'joined' || status === 'opponent_disconnected') && (
                    <div className='flex items-center justify-center h-10 mt-1'>
                        {!confirmingForfeit
                            ?  (
                                <button
                                    className='text-xs text-purple-600 hover:text-red-400 transition-colors tracking-widest'
                                    onClick={handleForfeitClick}
                                >
                                    {t('giveUp')}
                                </button>
                            ) : (
                                <div className='flex items-center gap-4'>
                                    <span className='text-xs text-purple-300'>{t('abandonMatch')}</span>
                                    <button
                                        className='text-xs text-red-400 hover:text-red-200 border border-red-700 px-3 py-1 rounded transition-colors'
                                        onClick={handleForfeitConfirm}
                                    >
                                        {tCommon('confirm')}
                                    </button>
                                    <button
                                        className='text-xs text-purple-400 hover:text-purple-200 transition-colors'
                                        onClick={handleForfeitCancel}
                                    >
                                        {tCommon('cancel')}
                                    </button>
                                </div>
                            )
                        }
                    </div>
                )}
            </div>
        </div>
    );
}

function Overlay({ children }: { children: React.ReactNode }) {
    return (
        <div className='absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-purple-100 rounded-lg'>
            {children}
        </div>
    );
}