import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../core/auth/AuthStore';
import { useGameSocket } from '../hooks/useGameSocket';
import { useMatchStore } from '../../../features/lobby/store/matchStore';
import { renderGame } from '../renderer/gameRender';
import { GameConstants } from '@transcendence/shared/constants/game.constants.js';
import { FriendsWidget } from '../../friends/components/FriendsWidget';

const { GAME_ACTION, PLAYER_SIDE } = GameConstants;

export default function GamePage() {
	const { matchId } = useParams<{ matchId: string }>();
	const navigate = useNavigate();
	const currentUserId = useAuthStore(state => state.user?.id);
	const currentUsername = useAuthStore(state => state.user?.username);
	const currentAvatar = useAuthStore(state => state.avatar);
	
	const { status, matchInfo, gameOver, waitSeconds, error, gameStateRef, sendAction } = useGameSocket(matchId!);

	const setActiveMatchId = useMatchStore(s => s.setActiveMatchId);
	const clearActiveMatchId = useMatchStore(s => s.clearActiveMatchId);
	const [disconnectCountdown, setDisconnectCountdown] = useState<number>(0);

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const animRef = useRef<number>(0);

	const location = useLocation();
	const isLocal = (location.state as { isLocal?: boolean } | null)?.isLocal ?? false;
	
	// Determine wich side the current user plays
	const isPlayer1 = matchInfo ? matchInfo.playerSide === 'left' : true;

	// Keyboard input
	const keysDown = useRef(new Set<string>());

	const handleKeyDown = useCallback((e: KeyboardEvent) => {
		if (keysDown.current.has(e.key)) return; // prevent repeat
		keysDown.current.add(e.key);

		if (isLocal) {
			// Local: W/S for left, ArrowUp/ArrowDown for right
			switch (e.key) {
				case 'w': case 'W': sendAction(GAME_ACTION.MOVE_UP, PLAYER_SIDE.LEFT); break;
				case 's': case 'S': sendAction(GAME_ACTION.MOVE_DOWN, PLAYER_SIDE.LEFT); break;
				case 'ArrowUp': sendAction(GAME_ACTION.MOVE_UP, PLAYER_SIDE.RIGHT); e.preventDefault(); break;
				case 'ArrowDown': sendAction(GAME_ACTION.MOVE_DOWN, PLAYER_SIDE.RIGHT); e.preventDefault(); break;
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

		if (isLocal) {
			// Left paddle (w-W-s-S)
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

			// Right paddle (arrows)
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
			// Online: both key sets control same paddle
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

	// keyboar inputs
	useEffect(() => {
		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	}, [handleKeyDown, handleKeyUp]);

	// Canvas render loop
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

	// Register active match on mount
	useEffect(() => {
		if (matchId) setActiveMatchId(matchId);
// test for reconnection resialence
//		return () => clearActiveMatchId();
//	}, [matchId, setActiveMatchId, clearActiveMatchId]);
	}, [matchId, setActiveMatchId]);

	// Clear on game end
	useEffect(() => {
		if (status === 'finished' || status === 'error') {
			clearActiveMatchId();
		}
	}, [status, clearActiveMatchId]);
	
	
	// Opponent discconnected countdown
	useEffect(() => {
		if (status !== 'opponent_disconnected') return;

		setDisconnectCountdown(waitSeconds);

		const interval = setInterval(() => {
			setDisconnectCountdown(s => Math.max(0, s - 1));
		}, 1000);

		return () => clearInterval(interval);
	}, [status, waitSeconds]);

	// Overlays
	const renderOverlay = () => {
		switch (status) {
			case 'connecting':
				return <Overlay>Connecting...</Overlay>;
			
			case 'joined':
				return (
					<Overlay>
						<p className='text-lg'>VS {matchInfo?.opponentUsername}</p>
						<p className='text-sm text-purple-400 mt-2'>Waiting for game to start...</p>
					</Overlay>
				);
			
			case 'opponent_disconnected':
				return (
					<Overlay>
						<p className='text-lg'>Opponent disconnected</p>
						<p className='text-sm text-purple-400 mt-2'>
							Waiting for reconnection... {disconnectCountdown}s
						</p>
					</Overlay>
				)
			
			case 'finished':
				const won = gameOver?.winnerId === currentUserId;
				const winnerText = isLocal
					? (gameOver?.winnerId === matchInfo?.opponentId ? 'PLAYER 2️⃣ WINNS!' : 'PLAYER 1️⃣ WINNS!')
					: (won ?  '🏆 YOU WIN!' : '🍷 YOU LOSE!');
				return (
					<Overlay>
						<p className='text-2xl mb-4'>{winnerText}</p>
						<p className='text-lg mb-6'>
							{gameOver?.player1Score} - {gameOver?.player2Score}
						</p>
						<button className='arcade-btn px-6 py-2 text-base' onClick={() => navigate('/home')}>
							BACK TO LOBBY
						</button>
					</Overlay>
				);
			
			case 'error':
				return (
					<Overlay>
						<p className='text-red-400 mb-4'>{error || 'Connection lost'}</p>
						<button className='arcade-btn px-6 py-2' onClick={() => navigate('/home')}>
							BACK TO LOBBY
						</button>
					</Overlay>
				);

			default:
				return null;
		}
	};

	return (
		<div className='retro-bg h-full relative flex items-center justify-center min-w-[1150px]'>
			<div className='absolute top-4 left-4'>
				<FriendsWidget /> {/** Tambien hay widget vacio aqui, no se debe completar? */}
			</div>
			<div className='flex flex-col items-center gap-8 ml-46'>
				{matchInfo && (
					<div className='flex items-center justify-center gap-80 w-[780px] mb-[-8px] z-10'>
						<div className='flex items-center gap-2'>
							<img
								src={isPlayer1 ? (currentAvatar ?? '') : matchInfo.opponentAvatar}
								alt='avatar'
								className='w-12 h-12 rounded-full border border-purple-500 object-cover'
								onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
							/>
							<span className='text-purple-200 text-base'>
								{isPlayer1 ? currentUsername : matchInfo.opponentUsername}
							</span>
						</div>
						<div className='flex items-center gap-2 flex-row-reverse'>
							<img
								src={isPlayer1 ? matchInfo.opponentAvatar : (currentAvatar ?? '')}
								alt='avatar'
								className='w-12 h-12 rounded-full border border-purple-500 object-cover'
								onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
							/>
							<span className='text-purple-200 text-base'>
								{isPlayer1 ? matchInfo.opponentUsername : currentUsername}
							</span>
						</div>
					</div>
				)}
				<div className='arcade-screen relative'>
					<canvas 
						ref={canvasRef}
						width={780}
						height={480}
						className='w-full h-full rounded-lg'
					/>
					{renderOverlay()}
				</div>
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