import { useEffect, useState } from 'react';

const QUEUE_TIMEOUT_S = 90;

interface Props {
	gameMode: string;
	onCancel: () => void;
	onPlayBot: () => void;
}

export default function MatchMaking({ gameMode, onCancel, onPlayBot }: Props) {
	const [remaining, setRemaining] = useState(QUEUE_TIMEOUT_S);

	useEffect(() => {
		const interval = setInterval(() => {
			setRemaining(s => {
				if (s <= 1) { clearInterval(interval); return 0; }
				return s -1;
			});			
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	return (
		<div className='w-full h-full flex flex-col items-center justify-center gap-8'>
			<h2 className='text-2xl tracking-widest'>SEARCHING OPPONENT</h2>
			<p className='text-sm opacity-70'>Mode: {gameMode}</p>
			<div className='text-6xl font-bold tracking-widest'>
				{remaining}s
			</div>
			{remaining === 0 &&
				<p className='text-sm text-yellow-400'>
					No opponent found
				</p>
			}
			<div className='flex gap-8 mt-4'>
				<button className='neon-btn text-xs' onClick={onCancel}>CANCEL</button>
				<button className='arcade-btn px-6 py-2' onClick={onPlayBot}>PLAY VS BOT</button>
			</div>
		</div>
	);
}