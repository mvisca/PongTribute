import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UserTypes } from '@transcendence/shared/types/user.types.js';

// AUTH STORE Zustand
import { useAuthStore } from '../../../core/auth/AuthStore';

// FRIENDS STORE Zustand
import { FriendEntry, FriendInvite, useFriendsStore } from '../store/friendsStore';
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

import { useToastStore } from '../../../core/toasts';
import { getProfile } from '../../profile/api/profileApi';

export default function FriendsPage() {

	const token = useAuthStore((state) => state.accessToken);
	const currentUserId = useAuthStore((state) => state.user?.id);

	const friends							= useFriendsStore(state => state.friends);
	const pending							= useFriendsStore(state => state.pending);
	const removeFriendStore 				= useFriendsStore(state => state.removeFriend);
	const removePendingStore 				= useFriendsStore(state => state.removePending);
	const addFriendStore 					= useFriendsStore(state => state.addFriend);

	const navigate = useNavigate();
	const dismiss = useToastStore(state => state.dismiss);

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const [searchInput, setSearchInput] = useState('');
	const [searchResult, setSearchResult] = useState<UserTypes.UserPublic | null>(null);
	const [searchError, setSearchError] = useState('');
	const [searchLoading, setSearchLoading] = useState(false);

	useEffect(() => {
		setLoading(false);
	}, []);

	const handleRemove = async (friendId: string) => {
		if (!token) return;

		try {
			await removeFriend(friendId, token);
			removeFriendStore(friendId);
		} catch (err: any) {
			setError(err?.message ?? 'Failed to remove friend');
		}
	};

	const handleRespond = async (senderId: string, accepted: boolean) => {
		if (!token) return;

		try {
			await respondFriendRequest(senderId, accepted, token);
			if (accepted) {
				const invite = pending[senderId];
				const profile = await getProfile(senderId, token).catch(() => null);

				if (invite) {
					addFriendStore({ 
						userId: senderId,
						username: profile?.username ?? invite?.senderUsername ?? senderId,
						avatar: profile?.avatar ?? invite?.senderAvatar ?? '',
						isOnline: profile?.isOnline ?? false
					} satisfies FriendEntry);
				}
			}
			removePendingStore(senderId);
			dismiss(senderId);

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
			else
				setSearchResult(user);

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

	if (loading)
		return <LoadingScreen />;

	return (
		<PageContainer>
			<div className='flex flex-col gap-6 w-full max-w-[420px]'>

				<AlertError message={error} />

				{/* FRIENDS LIST */}
				<FormCard title={`FRIENDS (${Object.keys(friends).length})`}>

					{/* BACK BUTTON */}
					<div className="flex justify-end mb-3">
						<button
							onClick={() => navigate('/profile')}
							className="text-purple-300 hover:text-white text-sm"
						>
							← BACK
						</button>
					</div>

					{Object.keys(friends).length === 0 ? (

						<p className='text-sm text-purple-400 text-center py-4'>
							No friends yet
						</p>

					) : (

						Object.values(friends).map(entry => (
							<FriendItem
								key={entry.userId}
								entry={entry}
								onRemove={handleRemove}
							/>
						))

					)}

				</FormCard>

				{/* ADD FRIEND */}
				<FormCard title='ADD FRIEND'>

					<div className='flex gap-10 items-start'>

						<FormInput
							value={searchInput}
							onChange={(value) => {
								setSearchInput(value);
								setSearchError('');
								setSearchResult(null);
							}}
							placeholder='Search by username'
							error={searchError}
						/>

						<button
							onClick={handleSearch}
							disabled={searchLoading || !searchInput.trim()}
							className='arcade-btn px-8 py-[0.6rem] text-sm self-start disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap'
						>
							{searchLoading ? '...' : 'SEARCH'}
						</button>

					</div>

					{searchResult && (

						<div className='flex items-center justify-between mt-3 p-3 bg-purple-900 rounded-lg'>

							<div className='flex items-center gap-3'>
								<AvatarDisplay src={searchResult.avatar} size='sm' />
								<span className='text-sm text-purple-200'>
									{searchResult.username}
								</span>
							</div>

							<ArcadeButton onClick={() => handleSendRequest(searchResult.id)}>
								ADD
							</ArcadeButton>

						</div>

					)}

				</FormCard>

				{/* PENDING REQUESTS */}
				{Object.keys(pending).length > 0 && (

					<FormCard title={`REQUESTS (${Object.keys(pending).length})`}>

						{Object.values(pending).map(req => (

							<PendingItem
								key={req.senderId}
								entry={req}
								onRespond={handleRespond}
							/>

						))}

					</FormCard>

				)}

			</div>
		</PageContainer>
	);
}

function PendingItem({
	entry,
	onRespond
}: {
	entry: FriendInvite;
	onRespond: (id: string, accepted: boolean) => void;
}) {

	return (
		<div className='friend-item'>

			<div className='flex items-center gap-3'>
				<AvatarDisplay src={entry.senderAvatar} size='sm' />
				<span className='text-sm text-purple-200'>
					{entry.senderUsername}
				</span>
			</div>

			<div className='flex gap-2'>

				<NeonButton onClick={() => onRespond(entry.senderId, true)}>
					✓
				</NeonButton>

				<button
					onClick={() => onRespond(entry.senderId, false)}
					className='text-xs text-red-400 hover:text-red-200 px-2'
				>
					✕
				</button>

			</div>

		</div>
	);
}
