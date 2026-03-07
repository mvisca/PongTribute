import { useEffect, useState } from 'react';
import type { UserTypes } from '@transcendence/shared/types/user.types.js';
import { getProfile } from '../../profile/api/profileApi';
import { AvatarDisplay } from '../../../shared/components/ui';
import { useAuth } from '../../../core/auth/AuthContext';

type Props = {
	friendId: string;
	onRemove?: (friendId: string) => void;
}

export function FriendItem({ friendId, onRemove }: Props) {
	const token = useAuth((state) => state.accessToken);
	const [user, setUser] = useState<UserTypes.UserPublic | null>(null);

	useEffect(() => {
		if (!token) return;
		getProfile(friendId, token)
			.then(setUser)
			.catch(() => {});
	}, [friendId]);

	if (!user) return null;

	return (
		<div className='friend-item'>
			<div className='flex items-center gap-3'>
				<AvatarDisplay src={user.avatar} size='sm' />
				<div>
					<p className='text-sm font-bold text-purple-200'>{user.username}</p>
					<span className={user.isOnline ? 'online-dot' : 'offline-dot'} />
					<span className='text-xs text-purple-400 ml-2'>
						{ user.isOnline ? 'Online' : 'Offline' }
					</span>
				</div>
			</div>
			{onRemove && (
				<button
					className='text-xs text-red-400 hover:text-red-200 transition-colors'
					onClick={() => onRemove(friendId)}
				>
					REMOVE
				</button>
			)}
		</div>
	);
}