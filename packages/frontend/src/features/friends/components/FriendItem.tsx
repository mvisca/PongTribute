import { AvatarDisplay } from '../../../shared/components/ui';
import { FriendEntry } from '../store/friendsStore';

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
					<span className={entry.isOnline ? 'text-green-400' : 'text-purple-500'}>
						{entry.isOnline ? '● Online' : '○ Offline'}
					</span>
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