import { AvatarDisplay } from '../../../shared/components/ui';
import { FriendEntry } from '../store/friendsStore';

/*
type Props = {
	entry: FriendEntry;
	onRemove?: (friendId: string) => void;
}

export function FriendItem({ entry, onRemove }: Props) {
	return (
		<div className='friend-item'>
			<div className='flex items-center gap-3'>
				<AvatarDisplay src={entry.avatar} size='sm' />
				<div>
					<p className='text-sm font-bold text-purple-200'>{entry.username}</p>
					<span className={entry.isOnline ? 'online-dot' : 'offline-dot'}>●</span>
				</div>
			</div>
			{onRemove && (
				<button
					className='text-xs text-red-400 hover:text-red-200 transition-colors'
					onClick={() => onRemove(entry.userId)}
				>
					REMOVE
				</button>
			)}
		</div>
	);
}
*/

type Props = {
	entry: FriendEntry;
	onRemove?: (friendId: string) => void;
	onPlay?: (friendId: string) => void;
	playLabel?: 'PLAY';
}

export function FriendItem({ entry, onRemove, onPlay, playLabel = 'PLAY' }: Props) {
	return (
		<div className='friend-item'>
			{/* Izquierda: avatar + info */}
			<div className='flex items-center gap-3'>
				<AvatarDisplay src={entry.avatar} size='sm' />
				<div className='flex flex-col'>
					<p className='text-sm font-bold text-purple-200'>{entry.username}</p>
					<span className={entry.isOnline ? 'online-dot' : 'offline-dot'}>●</span>
				</div>
			</div>

			{/* Derecha: REMOVE + PLAY */}
			<div className='flex flex-col items-end justfy-start gap-3 pt-0'>
				{onRemove && (
					<button
						className='text-[10px] text-red-400 hover:text-red-200 transition-colors'
						onClick={() => onRemove(entry.userId)}
					>
						REMOVE
					</button>
				)}
				{onPlay && entry.isOnline && (
					<button
						className='arcade-btn-sm'
						onClick={() => onPlay(entry.userId)}
					>
						{playLabel}
					</button>
				)}
			</div>

		</div>
	);
}