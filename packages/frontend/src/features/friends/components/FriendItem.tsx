import { AvatarDisplay } from '../../../shared/components/ui';
import { FriendEntry } from '../store/friendsStore';

type Props = {
	entry: FriendEntry;
	onRemove?: (friendId: string) => void;
	onPlayFromChild?: (friendId: string, friendUsername: string, friendAvatar: string) => void;
	playLabel?: 'PLAY';
}

export function FriendItem({ entry, onRemove, onPlayFromChild, playLabel = 'PLAY' }: Props) {
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
				{onPlayFromChild && entry.isOnline && (
					<button
						className='arcade-btn-sm'
						onClick={() => onPlayFromChild(entry.userId, entry.username, entry.avatar)}
					>
						{playLabel}
					</button>
				)}
			</div>

		</div>
	);
}