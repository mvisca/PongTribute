import { useTranslation } from 'react-i18next';
import { AvatarDisplay } from '../../../shared/components/ui';
import { FriendEntry } from '../store/friendsStore';

type Props = {
	entry: FriendEntry;
	onRemove?: (friendId: string) => void;
	onPlayFromChild?: (friendId: string, friendUsername: string, friendAvatar: string) => void;
}

export function FriendItem({ entry, onRemove, onPlayFromChild }: Props) {
	const { t } = useTranslation('common');

	return (
		<div className='friend-item'>
			{/* Izquierda: avatar + info */}
			<div className='flex items-center gap-3 min-w-0'>
				<AvatarDisplay src={entry.avatar} size='sm' />
				<div className='flex flex-col min-w-0'>
					<p className='text-sm font-bold text-purple-200 truncate' title={entry.username}>
						{entry.username}
					</p>
					<span className={entry.isOnline ? 'online-dot' : 'offline-dot'}>●</span>
				</div>
			</div>

			{/* Derecha: REMOVE + PLAY */}
			<div className='flex flex-col items-end justfy-start gap-3 pt-0 shrink-0'>
				{onRemove && (
					<button
						className='text-[10px] text-red-400 hover:text-red-200 transition-colors'
						onClick={() => onRemove(entry.userId)}
					>
						{t('remove')}
					</button>
				)}
				{onPlayFromChild && entry.isOnline && (
					<button
						className='arcade-btn-sm'
						onClick={() => onPlayFromChild(entry.userId, entry.username, entry.avatar)}
					>
						{t('play')}
					</button>
				)}
			</div>

		</div>
	);
}