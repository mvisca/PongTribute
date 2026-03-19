import { useState } from 'react';
import type { GameConstants } from '@transcendence/shared';

const GAME_MODES: { value: GameConstants.GameModeType; label: string }[] = [
	{ value: 'classic', label: 'Classic'},
	{ value: 'speed', label: 'Speed' },
	{ value: 'pro', label: 'Pro' },
];

export type ValidScore = 5 | 7 | 9 | 11 | 13 | 15 | 17 | 19 | 21;
const TARGET_SCORES: ValidScore[] = [5, 7, 9, 11, 13, 15, 17, 19, 21];

interface Props {
	title: string;
	onStart: (gameMode: GameConstants.GameModeType, targetScore: ValidScore) => void;
	onBack: () => void;
	loading?: boolean;
	fixedScore?: ValidScore;
}

export default function MatchSetup({
	title,
	onStart,
	onBack,
	loading = false,
	fixedScore,
}: Props) {
	const [gameMode, setGameMode] = useState<GameConstants.GameModeType>('classic');
	const [scoreIndex, setScoreIndex] = useState(TARGET_SCORES.indexOf(11));

	return (
		<div className='w-full h-full flex flex-col items-center justify-center gap-8'>
			<h2 className='text-2xl tracking-widest'>
				{title}
			</h2>

			{/* Mode selection */}
			<div className='flex gap-6'>
				{GAME_MODES.map((m) => (
					<button
						key={m.value}
						onClick={() => setGameMode(m.value)}
						className={`arcade-btn px-6 py-2 text-base transition-all duration-200 ${
							gameMode === m.value
								? 'bg-blue-700 border-2 border-purple-400 shadow-[0_0_20px_#00ffff] scale-105 text-white'
								: 'opacity-80 hover:opacity-100'
						}`}
						style={gameMode === m.value ? {
							boxShadow: '0 0 12px #00ffff, 0 0 24px rgba(0, 255, 255, 0.6)'
						} : undefined}
					>
						{m.label}
					</button>
				))}
			</div>

			{/* Score limit to chose */}
			{!fixedScore && (
				<div className='flex flex-col text-base items-center gap-2 w-64'>
					<span>
						Score Limit: {TARGET_SCORES[scoreIndex]}
					</span>
					<input type="range"
						min={0}
						max={TARGET_SCORES.length -1}
						value={scoreIndex}
						onChange={(e) => setScoreIndex(Number(e.target.value))}
						className='w-full h-[2px] accent-purple-400 cursor-pointer'
						/>
				</div>
			)}
			{/* Fixed score for public matches */}
			{fixedScore && (
				<p className='text-sm opacity-60'>Score: {fixedScore} (fixed)</p>
			)}

			<div className='flex gap-6 mt-4'>
				<button className='arcade-btn px-1 py-2 text-base' onClick={onBack}>CANCEL</button>
				<button
					className='arcade-btn px-6 py-2 text-base'
					onClick={() => onStart(gameMode, TARGET_SCORES[scoreIndex])}
					disabled={loading}
				>
					{loading ? 'LOADING...' : 'START'}
				</button>
			</div>
		</div>
	);
}