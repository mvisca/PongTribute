import { useEffect, useState } from 'react';
import { MatchConstants } from '@transcendence/shared/constants/match.constants.js';

const QUEUE_TIMEOUT_S = MatchConstants.QUEUE_TIMEOUT_MS / 1000;

interface Props {
	gameMode: string;
	expired?: boolean;
	onExpired?: () => void;
	onCancel: () => void;
	onPlayBot: () => void;
}

export default function MatchMaking({ gameMode, expired, onExpired, onCancel, onPlayBot }: Props) {
	const [remaining, setRemaining] = useState(QUEUE_TIMEOUT_S);

	useEffect(() => {
		if (expired) return;
		const interval = setInterval(() => {
			setRemaining(s => {
				if (s <= 1) { clearInterval(interval); onExpired?.(); return 0; }
				return s -1;
			});			
		}, 1000);
		return () => clearInterval(interval);
	}, [expired, onExpired]);

	return (
		<div className='w-full h-full flex flex-col items-center justify-center gap-8'>
			<h2 className='text-2xl tracking-widest'>SEARCHING OPPONENT</h2>
			<p className='text-sm opacity-70'>Mode: {gameMode}</p>
			<div className='text-4xl font-bold tracking-widest'>
				{expired || remaining === 0 ? '–' : `${remaining}s`}
			</div>
			{(expired || remaining === 0) && (
				<p className='text-base text-yellow-500'>
					No opponent found - Expired request
				</p>
			)}
			<div className='flex gap-8 mt-4'>
				<button className='arcade-btn px-6 py-2 text-base' onClick={onCancel}>CANCEL</button>
				<button className='arcade-btn px-6 py-2 text-base' onClick={onPlayBot}>PLAY VS BOT</button>
			</div>
		</div>
	);
}