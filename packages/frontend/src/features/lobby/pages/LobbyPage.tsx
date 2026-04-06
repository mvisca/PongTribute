import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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

const MENU_ITEMS: { type: MatchType; label: string }[] = [
	{ type: 'public', label: 'PLAY ONLINE' },
	{ type: 'local',  label: 'LOCAL MATCH' },
	{ type: 'bot',	  label: 'PLAY VS BOT' },
];

const SETUP_TITLES: Record<MatchType, string> = {
	public:	 'ONLINE MATCH SETTINGS',
	local:	 'LOCAL MATCH SETTINGS',
	bot:	 'BOT MATCH SETTINGS',
	private: 'CHALLENGE SETTINGS FRIEND',
};

export default function LobbyPage() {
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
	
	// Visual feedback states for event outcomes
	const [friendRejected, setFriendRejected] = useState(false);
	const [friendExpired, setFriendExpired] = useState(false);
	const [queueExpired, setQueueExpired] = useState(false);

	// Timer for delayed step transitions (timeout/rejected/expired)
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

	// Cleanup transition timer on unmount
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

	// Main menu
	const handleMenuSelect = (type: MatchType) => {
		clearTransitionTimer();
		resetFeedbackStates();
		setMatchType(type);
		setError('');
		setStep('setup');
	};

	// PLAY (public, local, bot)
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
			setError(err?.message ?? 'Failed to create match');
		} finally {
			setLoading(false);
		}
	};

	// Cancel public queue
	const handleCancelQueue = async () => {
		if (!token) return;
		clearTransitionTimer();
		resetFeedbackStates();
		try { await leaveQueue(token); } catch {}
		clearPendingEvent(); // In case an event arrives during cancell 
		setStep('setup');
	};

	// Play vs bot (from matchmaking or friend_waiting)
	const handlePlayBot = async () => {
		if (!token) return;
		clearTransitionTimer();
		resetFeedbackStates();
		setLoading(true);

		// In case click comes from friend challenge
		if (pendingMatchId) {
			try { await cancelMatch(pendingMatchId, token); } catch {}
			setPendingMatchId('');
		}

		// leaveQueue before creating bot match. cleans user from redis queue
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
			setError(err?.message ?? 'Failed to create bot match');
			setStep('menu');
		} finally {
			setLoading(false);
		}
	};

	// Friend challenge from friend widget
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

	// Friend challenge start
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
			setError(err?.message ?? 'Failed to send invitation');
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
		if (queueExpired) return; // guard contra doble llamada
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
	
	// Render
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
					<>
					<MatchSetup
					title={`MATCH SETTINGS VS ${friendUsername.toUpperCase()}`}
					onStart={handleFriendStart}
					onBack={() => setStep('menu')}
					loading={loading}
                    />
					</>
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
						<h1 className='text-2xl tracking-widest'style={{ textShadow: '0 0 10px #a855f7, 0 0 20px #a855f7, 0 0 40px #a855f7' }}>PONG🏓TRIBUTE</h1>
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
				<p className='text-purple-200 text-lg'>Desktop required to play</p>
				<p className='text-purple-400 text-sm'>🖥️ Large screen + ⌨️ Keyboard required</p>
			</div>
		);
	}

	return (
		<div className='retro-bg h-full overflow-hidden relative flex items-center justify-center text-purple-100 min-w-[1150px]'>
			
			{/* Widget anchored top-left */}
			<div className='absolute top-4 left-4'>
				<FriendsWidget onPlayToFather={handleFriendChallenge} />
			</div>

			{/* Arcade screen center */}
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
