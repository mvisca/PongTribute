import { useEffect, useState } from 'react';
import type { UserTypes } from '@transcendence/shared/types/user.types.js';
// AUTH STORE Zustand
import { useAuthStore } from '../../../core/auth/AuthStore';
// PROFILE API
import { getProfile } from '../../profile/api/profileApi';
// FRIENDS STORE Zustand
import { useFriendsStore } from '../store/friendsStore';
// FRIENDS API
import {
	sendFriendRequest,
	respondFriendRequest,
	removeFriend,
	findUserByUsername
} from '../api/friendsApi';
// FRIENDS Components
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

export default function FriendsPage() {

	const token 							= useAuthStore((state) => state.accessToken);
	const currentUserId						= useAuthStore((state) => state.user?.id);

	const setFriends						= useFriendsStore(state => state.setFriends);
	const setPending						= useFriendsStore(state => state.setPending);
	const removeFriendStore 				= useFriendsStore(state => state.removeFriend);
	const removePendingStore 				= useFriendsStore(state => state.removePending);

	const [loading, setLoading]				= useState(true);
	const [error, setError]					= useState('');

	const [searchInput, setSearchInput] 	= useState('');
	const [searchResult, setSearchResult] 	= useState<UserTypes.UserPublic | null>(null);
	const [searchError, setSearchError] 	= useState('');
	const [searchLoading, setSearchLoading]	= useState(false);

	useEffect(() => {
		loadFriendships();
	}, [token]); // TODO sin dependencias?

	const handleRemove = async (friendId: string) => {
		if (!token) return;
		try{
			await removeFriend(friendId, token);
			removeFriendStore(friendId);
		} catch (err: any) {
			setError(err?.message ?? 'Failed to remove friend');
		}
	};

	const handleRespond = async (initiatorId: string, accepted: boolean) => {
		if (!token) return;
		try {
			await respondFriendRequest(initiatorId, accepted, token);
			removePendingStore(initiatorId);
			if (accepted) await loadFriendships(); // Reload friends
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
			{Object.keys(pending).length > 0 && (
				<FormCard title={`REQUESTS (${Object.keys(pending).length})`}>
					{ Object.values(pending).map( req => (
						<PendingItem
							key={req.initiatorId}
							initiatorId={req.initiatorId}
							token={token!}
							onRespond={handleRespond}
						/>
					))}
				</FormCard>
			)}

			{/*Friends list*/}
			<FormCard title={`FRIENDS (${Object.keys(friends).length})`}>
				{ Object.keys(friends).length === 0
					? (<p className='text-sm text-purple-400 text-center py-4'>No friends yet</p>)
					: Object.values(friends).map(entry => (
						<FriendItem
							key={entry.userId}
							entry={entry}
							onRemove={handleRemove}
						/>
					))
				}
			</FormCard>
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
