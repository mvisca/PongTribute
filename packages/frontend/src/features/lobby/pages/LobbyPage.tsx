import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../core/auth/AuthStore';
import { createMatch, leaveQueue } from '../../game/api/gameApi';
import { GameConstants } from '@transcendence/shared/constants/game.constants.js';
import MatchSetup, { type ValidScore } from '../components/MatchSetup';
import MatchMaking from '../components/MatchMaking';
import { useMatchStore } from '../store/matchStore';
import { FriendsWidget } from '../../friends/components/FriendsWidget';


type MatchType = 'public' | 'local' | 'bot';
type Step = 'menu' | 'setup' | 'matchmaking';

const MENU_ITEMS: { type: MatchType; label: string }[] = [
	{ type: 'public', label: 'PLAY ONLINE' },
	{ type: 'local', label: 'LOCAL MATCH' },
	{ type: 'bot', label: 'PLAY VS BOT' },
];

const SETUP_TITLES: Record<MatchType, string> = {
	public: 'ONLINE MATCH',
	local: 'LOCAL MATCH',
	bot: 'VS BOT',
};

export default function LobbyPage() {
	const navigate = useNavigate();
	const token = useAuthStore(state => state.accessToken);

	const pendingEvent = useMatchStore(state => state.pendingEvent);
	const clearPendingEvent = useMatchStore(state => state.clearPendingEvent);

	const [step, setStep] = useState<Step>('menu');
	const [matchType, setMatchType] = useState<MatchType>('public');
	const [gameMode, setGameMode] = useState<GameConstants.GameModeType>('classic');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

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
				setError(pendingEvent.reason || 'Queue timed out - no opponent found');
				setStep('setup');
				break;
		}
	}, [pendingEvent, clearPendingEvent, navigate]);

	const handleMenuSelect = (type: MatchType) => {
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

	const handleCancelQueue = async () => {
		if (!token) return;
		try { await leaveQueue(token); } catch {}
		clearPendingEvent(); // In case an event arrives during cancell 
		setStep('setup');
	};

	const handlePlayBot = async () => {
		if (!token) return;
		setLoading(true);
		try {
			const result = await createMatch(
				{ matchType: 'bot', gameMode, targetScore: 11 },
				token
			);
			if ('id' in result) {
				navigate(`/game/${result.id}`);
			}
		} catch (err: any) {
			setError(err?.message ?? 'Failed to create bot match');
			setStep('setup');
		} finally {
			setLoading(false);
		}
	};

	const renderScreen = () => {
		switch (step) {
			case 'matchmaking':
				return (
					<MatchMaking
						gameMode={gameMode}
						onCancel={handleCancelQueue}
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
					/>
				);
			
			default:
				return (
					<div className='w-full h-full flex flex-col items-center justify-center gap-8'>
						<h1 className='text-2xl tracking-widest'style={{ textShadow: '0 0 10px #a855f7, 0 0 20px #a855f7, 0 0 40px #a855f7' }}>PING 🏓 PONG</h1>
						<div className='arcade-menu'>
							{MENU_ITEMS.map(({ type, label}) => (
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

	return (
		<div className='retro-bg h-full relative flex items-center justify-center text-purple-100 min-w-[1150px]'>
			
			{/* Widget anclado top-left */}
			<div className='absolute top-4 left-4'>
				<FriendsWidget />
			</div>

			{/* Arcade screen centrado */}
			<div className='flex flex-col items-center gap-4 ml-46'>
				{error && (
					<p className='text-red-400 text-sm'>{error}</p>
				)}
				<div className='arcade-screen'>
					{renderScreen()}
				</div>
			</div>

		</div>
	);
}
