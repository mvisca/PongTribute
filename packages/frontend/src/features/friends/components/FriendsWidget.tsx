// packages/frontend/src/features/friends/components/FriendsWidget.tsx
import { useState } from 'react';
import { useAuthStore } from '../../../core/auth/AuthStore';
import { useFriendsStore } from '../store/friendsStore';
import { sendFriendRequest, findUserByUsername, respondFriendRequest } from '../api/friendsApi';
import { FriendItem } from './FriendItem';
import { AvatarDisplay } from '../../../shared/components/ui';


export function FriendsWidget() {
	const token         = useAuthStore(state => state.accessToken);
	const currentUserId = useAuthStore(state => state.user?.id);
	const friends       = useFriendsStore(state => state.friends);
	const pending        = useFriendsStore(state => state.pending);
	const removePending = useFriendsStore(state => state.removePending);
	
	const [searchInput,  setSearchInput]  = useState('');
	const [searchResult, setSearchResult] = useState<{ id: string; username: string; avatar: string } | null>(null);
	const [searchError,  setSearchError]  = useState('');
	const [searchLoading, setSearchLoading] = useState(false);

	const handleSearch = async () => {
		if (!token || !searchInput.trim()) return;
		setSearchError('');
		setSearchResult(null);
		setSearchLoading(true);
		try {
			const user = await findUserByUsername(searchInput.trim(), token);
			if (user.id === currentUserId) setSearchError("That's you!");
			else setSearchResult(user);
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

	const handleRespond = async (senderId: string, accepted: boolean) => {
		if (!token) return;
		try {
			await respondFriendRequest(senderId, accepted, token);
			if (!accepted) removePending(senderId);
		} catch {}
	};
	
	return (
		<div className='bg-purple-950 rounded-xl shadow-lg w-56 flex flex-col gap-3 p-3'>

			{/* FRIENDS LIST */}
			<div>
				<h2 className='retro-title-sm mb-1'>
					FRIENDS ({Object.keys(friends).length})
				</h2>
				{Object.keys(friends).length === 0 ? (
					<p className='text-[15px] text-purple-400 text-center py-2'>No friends yet</p>
				) : (
					<div className='flex flex-col gap-1'>
						{Object.values(friends).map(entry => (
							<FriendItem key={entry.userId} entry={entry} />
						))}
					</div>
				)}
			</div>

			<div className='border-t border-purple-700' />

			{/* ADD FRIEND */}
			<div>
				<h2 className='retro-title-sm mb-1'>ADD FRIEND</h2>
				<div className='flex gap-2'>
					<input
						className='input-sm mb-3 w-32'
						placeholder='Username'
						value={searchInput}
						onChange={(e) => { setSearchInput(e.target.value); setSearchError(''); setSearchResult(null); }}
					/>
					<button
						onClick={handleSearch}
						disabled={searchLoading || !searchInput.trim()}
						className='arcade-btn-sm disabled:opacity-50 disabled:cursor-not-allowed'
					>
						{searchLoading ? '...' : '+'}
					</button>
				</div>

				{searchError && (
					<p className='text-xs text-red-400 mt-1'>{searchError}</p>
				)}

				{searchResult && (
					<div className='flex items-center justify-between mt-2 p-2 bg-purple-900 rounded-lg'>
						<div className='flex items-center gap-2'>
							<AvatarDisplay src={searchResult.avatar} size='sm' />
							<span className='text-[10px] text-purple-200'>{searchResult.username}</span>
						</div>
						<button
							onClick={() => handleSendRequest(searchResult.id)}
							className='arcade-btn-sm'
						>
							ADD
						</button>
					</div>
				)}
			</div>

			{/* PENDING REQUESTS */}
			{Object.keys(pending).length > 0 && (
				<>
					<div className='border-t border-purple-700' />
					<div>
						<h2 className='retro-title-sm mb-1'>
							REQUESTS ({Object.keys(pending).length})
						</h2>
						<div className='flex flex-col gap-1'>
							{Object.values(pending).map(req => (
								<div key={req.senderId} className='flex items-center justify-between p-2 bg-purple-900 rounded-lg'>
									<div className='flex items-center gap-2'>
										<AvatarDisplay src={req.senderAvatar} size='sm' />
										<span className='text-[10px] text-purple-200'>{req.senderUsername}</span>
									</div>
									<div className='flex gap-1'>
										<button
											onClick={() => handleRespond(req.senderId, true)}
											className='arcade-btn-sm'
										>
											✓
										</button>
										<button
											onClick={() => handleRespond(req.senderId, false)}
											className='text-[10px] text-red-400 hover:text-red-200 px-2'
										>
											✕
										</button>
									</div>
								</div>
							))}
						</div>
					</div>
				</>
			)}

		</div>
	);
}