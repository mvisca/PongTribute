
import { useEffect, useState } from 'react';
import { useAuth } from '../../../core/auth/AuthContext';
import { FRIENDSHIP_STATUS } from '@transcendence/shared/constants/friendship.constants.js';
import type { FriendshipTypes } from '@transcendence/shared/types/friendship.types.js';
import type { UserTypes } from '@transcendence/shared/types/user.types.js';
import { getProfile } from '../../profile/api/profileApi';
import {
	getFriendships,
	sendFriendRequest,
	respondFriendRequest,
	removeFriend,
	findUserByUsername
} from '../api/friendsApi';
import { FriendItem } from '../components/FriendItem';
import {
	PageContainer,
	FormCard,
	FormInput,
	ArcadeButton,
	NeonButton,
	AlertError,
	AvatarDisplay,
	LoadingScreen
} from '../../../shared/components/ui';

import { useToastStore, TOAST_TYPE, TOAST_BUTTON_STYLE } from '../../../core/toasts'; //TEST

export default function FriendsPage() {
	const { info, success, error: toastError, action } = useToastStore(); //TEST

	const token 					= useAuth((state) => state.accessToken);
	const currentUserId				= useAuth((state) => state.user?.id);

	const [friends, setFriends]		= useState<FriendshipTypes.Friendship[]>([]);
	const [pending, setPending]		= useState<FriendshipTypes.Friendship[]>([]);
	const [loading, setLoading]		= useState(true);
	const [error, setError]			= useState('');

	const [searchInput, setSearchInput] 	= useState('');
	const [searchResult, setSearchResult] 	= useState<UserTypes.UserPublic | null>(null);
	const [searchError, setSearchError] 	= useState('');
	const [searchLoading, setSearchLoading]	= useState(false);

	const loadFriendships = async () => {
		if (!token) return;

		try {
			const [acceptedRes, allPendingRes] = await Promise.all([
				getFriendships(token, FRIENDSHIP_STATUS.ACCEPTED),
				getFriendships(token, FRIENDSHIP_STATUS.PENDING),
			]);

			setFriends(acceptedRes.friendships);
			setPending(allPendingRes.friendships.filter(friendship => friendship.initiatorId !== currentUserId));

		} catch {
			setError('Failed to load friends');
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		loadFriendships();
	}, []);

	const handleRemove = async (friendId: string) => {
		if (!token) return;

		try{
			await removeFriend(friendId, token);
			setFriends(friendsList => friendsList.filter(
				friend => friend.userId && friend.userId !== friendId
			));
		} catch (err: any) {
			setError(err?.message ?? 'Failed to remove friend');
		}
	};

	const handleRespond = async (initiatorId: string, accepted: boolean) => {
		if (!token) return;

		try {
			await respondFriendRequest(initiatorId, accepted, token);
			setPending(friendsList => friendsList.filter(
				friend => friend.initiatorId && friend.initiatorId !== initiatorId
			));
			if (accepted) await loadFriendships();
		} catch (err: any) {
			setError(err?.message ?? 'Failed to respond to friend request');
		}
	};

	const handleSearch = async () => {
		if (!token || !searchInput.trim()) return;
		setSearchError('');
		setSearchResult(null);
		setSearchLoading(true);

		try {
			const user = await findUserByUsername(searchInput.trim(), token);
			if (user.id === currentUserId)
				setSearchError("That's you!");
			else {
				setSearchResult(user);
			}
		} catch {
			setSearchError('User not found');
		} finally {
			setSearchLoading(false);
		}
	};

	const handleSendRequest = async (friendId: string) => {
		if (!token) return;

		try {
			await sendFriendRequest(friendId, token);
			setSearchResult(null);
			setSearchInput('');
		} catch (err: any) {
			setSearchError(err?.message ?? 'Failed to send request');
		}
	};

	if (loading) return <LoadingScreen />;

	return (
		<PageContainer>
			<AlertError message={error} />

			{/*Search*/}
			<FormCard title='ADD FRIEND'>
				<div className='flex gap-2'>
					<FormInput
						value={searchInput}
						onChange={(value) => { setSearchInput(value); setSearchError(''); setSearchResult(null);}}
						placeholder='Search by username'
						error={searchError}
					/>
					<ArcadeButton onClick={handleSearch} disabled={searchLoading || !searchInput.trim()}>
						{searchLoading ? '...' : 'SEARCH'}
					</ArcadeButton>
				</div>

				{searchResult && (
					<div className='flex items-center justify-between mt-3 p-3 bg-purple-900 rounded-lg'>
						<div className='flex items-center gap-3'>
							<AvatarDisplay src={searchResult.avatar} size='sm' />
							<span className='text-sm text-purple-200'>{searchResult.username}</span>
						</div>
						<NeonButton onClick={() => handleSendRequest(searchResult.id)} >
							ADD
						</NeonButton>
					</div>
				)}
			</FormCard>

			{/*Pending requests*/}
			{pending.length > 0 && (
				<FormCard title={`REQUESTS (${pending.length})`}>
					{pending.map(friendRequest => (
						<PendingItem
							key={friendRequest.initiatorId}
							initiatorId={friendRequest.initiatorId}
							token={token!}
							onRespond={handleRespond}
						/>
					))}
				</FormCard>
			)}

			{/*Friends list*/}
			<FormCard title={`Friends (${friends.length})`}>
				{friends.length === 0
					? (
						<p className='text-sm text-purple-400 text-center py-4'>No friends yet</p>
					) : (
						friends.map(friendship => {
							const friendId = friendship.userId === currentUserId ? friendship.friendId : friendship.userId;
							return (
								<FriendItem
									key={friendId}
									friendId={friendId}
									onRemove={handleRemove}
								/>
							);
						})
					)
				}
			</FormCard>

			{/*TEST DE TOAST}
			<div className='flex gap-2 flex-wrap'>
				<button onClick={() => info('Amigo conectado')}>Toast info</button>
				<button onClick={() => success('Solicitud enviada')}>Toast success</button>
				<button onClick={() => toastError('Error de red')}>Toast error</button>
				<button onClick={() => action({
					type: TOAST_TYPE.INFO,
					message: 'quiere ser tu amigo',
					duration: 0,
					actions: [
						{ label: 'Aceptar', onClick: () => console.log('aceptado'), style: TOAST_BUTTON_STYLE.PRIMARY },
						{ label: 'Rechazar', onClick: () => console.log('rechazado'), style: TOAST_BUTTON_STYLE.DANGER },
					],
					expiresAt: Date.now() + 10000
				})}>Toast action</button>
			</div>
			{/*FIN DE TEST DE TOAST*/}

		</PageContainer>
	);
}

function PendingItem({
	initiatorId,
	token,
	onRespond,
}: {
	initiatorId: string;
	token: string;
	onRespond: (id: string, accepted: boolean) => void;

}) {
	const [user, setUser] = useState<UserTypes.UserPublic | null>(null);

	useEffect(() => {
		getProfile(initiatorId, token)
			.then(setUser)
			.catch(() => {});
	}, [initiatorId]);

	if (!user) return null;

	return (
		<div className='friend-item'>
			<div className='flex items-center gap-3'>
				<AvatarDisplay src={user.avatar} size='sm' />
				<span className='text-sm text-purple-200'>{user.username}</span>
			</div>

			<div className='flex gap-2'>
				<NeonButton onClick={() => onRespond(initiatorId, true)}>✓</NeonButton>
				<button
					onClick={() => onRespond(initiatorId, false)}
					className='text-xs text-red-400 hover:text-red-200 px-2'
				>
					✕
				</button>
			</div>
		</div>
	);
}
