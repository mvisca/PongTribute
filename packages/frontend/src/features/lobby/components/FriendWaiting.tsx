import { useEffect, useState } from 'react';
import { AvatarDisplay } from '../../../shared/components/ui';

const INVITE_TIMEOUT_S = 60;

interface Props{
	friendUsername: string;
	friendAvatar: string;
	onCancel: () => void;
	onPlayBot: () => void;
}

export default function FriendWaiting({friendUsername, friendAvatar, onCancel, onPlayBot}: Props) {
	const [remaining, setRemaining] = useState(INVITE_TIMEOUT_S);

	useEffect(() => {
		const interval = setInterval(() => {
			setRemaining(s => {
				if (s <= 1) { clearInterval(interval); return 0; }
				return s - 1;
			});
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	return (
		<div className='w-full h-full flex flex-col items-center justify-center gap-8'>
			<AvatarDisplay src={friendAvatar} size='lg' />
			<h2 className='text-2xl tracking-widest'>WAITING FOR</h2>
			<p className='text-xl text-purple-300 tracking-widest'>{friendUsername}</p>

			<div className='text-6xl font-bold tracking-widest'>
				{remaining > 0 ? `${remaining}s` : '–'}
			</div>

			{remaining === 0 && (
				<p className='text-sm text-yellow-400'>Friend did not respond</p>
			)}

			<div className='flex gap-8 mt-4'>
				<button
					className='neon-btn text-xs'
					onClick={onCancel}
				>
					CANCEL
				</button>
				<button
					className='arcade-btn px-6 py-2'
					onClick={onPlayBot}
				>
					PLAY VS BOT
				</button>
			</div>
		</div>
	);
}