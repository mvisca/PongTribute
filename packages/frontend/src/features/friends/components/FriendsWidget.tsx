// packages/frontend/src/features/friends/components/FriendsWidget.tsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../core/auth/AuthStore';
import { useFriendsStore, MatchInviteEntry } from '../store/friendsStore';
import { acceptMatch, rejectMatch } from '../../game/api/gameApi';
import { useNavigate } from 'react-router-dom';
import { sendFriendRequest, findUserByUsername, respondFriendRequest, removeFriend, cancelFriendRequest } from '../api/friendsApi';
import { getProfile } from '../../profile/api/profileApi';
import { FriendEntry } from '../store/friendsStore';
import { FriendItem } from './FriendItem';
import { AvatarDisplay, TimeoutBar } from '../../../shared/components/ui';
import { useToastStore } from '../../../core/toasts';
import { FEEDBACK_WIDGET_MS } from '../../../shared/constants/ui.constants';

interface Props {
	onPlayToFather?: (friendId: string, friendUsername: string, friendAvatar: string) => void;
}

export function FriendsWidget({ onPlayToFather }: Props) {
	const { t } = useTranslation('friends');
	const { t: tCommon } = useTranslation('common');

	const token = useAuthStore(state => state.accessToken);
	const currentUserId = useAuthStore(state => state.user?.id);

	const friends = useFriendsStore(state => state.friends);
	const pending = useFriendsStore(state => state.pending);
	const removePending = useFriendsStore(state => state.removePending);
	const removeFriendStore = useFriendsStore(state => state.removeFriend);
	const addFriend = useFriendsStore(state => state.addFriend);
	const sentRequests = useFriendsStore(state => state.sentRequests);
	const removeSentRequest = useFriendsStore(state => state.removeSentRequest);

	const matchInvites = useFriendsStore(state => state.matchInvites);
	const removeMatchInvite = useFriendsStore(state => state.removeMatchInvite);
	const navigate = useNavigate();

	useEffect(() => {
		const invites = Object.values(matchInvites);
		if (invites.length === 0) return;

		const interval = setInterval(() => {
			const now = Date.now();
			invites.forEach(inv => {
				if (inv.expiresAt && inv.expiresAt <= now) {
					removeMatchInvite(inv.matchId);
				}
			});
		}, 1000);

		return () => clearInterval(interval);
	}, [matchInvites, removeMatchInvite]);


	const dismiss = useToastStore(state => state.dismiss);

	const [searchInput, setSearchInput] = useState('');
	const [searchResult, setSearchResult] = useState<{ id: string; username: string; avatar: string } | null>(null);
	const [searchError, setSearchError] = useState('');
	const [searchLoading, setSearchLoading] = useState(false);
	const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);


	const showFeedback = (msg: string, ok: boolean) => {
		setFeedback({ msg, ok });
		setTimeout(() => setFeedback(null), FEEDBACK_WIDGET_MS);
	};

	const handleSearch = async () => {
		if (!token || !searchInput.trim()) return;
		setSearchError('');
		setSearchResult(null);
		setSearchLoading(true);
		try {
			const user = await findUserByUsername(searchInput.trim(), token);
			if (user.id === currentUserId) {
				setSearchInput('');
				showFeedback(t('thatsYou'), false);
			} else if (friends[user.id]) {
				setSearchInput('');
				showFeedback(t('alreadyFriends'), false);
			} else {
				setSearchResult(user);
			}
		} catch {
			setSearchError(t('userNotFound'));
		} finally {
			setSearchLoading(false);
		}
	};
	const handleSendRequest = async (friendId: string) => {
		if (!token) return;
		try {
			await sendFriendRequest(friendId, token);
			const addSentRequest = useFriendsStore.getState().addSentRequest;
			addSentRequest({
				receiverId: friendId,
				receiverUsername: searchResult?.username ?? friendId,
				receiverAvatar: searchResult?.avatar ?? '',
			});
			setSearchResult(null);
			setSearchInput('');
			showFeedback(t('requestSent'), true);
		} catch (err: any) {
			setSearchError(err?.message ?? t('failedToSend'));
		}
	};

	const handleRespond = async (senderId: string, accepted: boolean) => {
		if (!token) return;
		try {
			await respondFriendRequest(senderId, accepted, token);
			if (accepted) {
				const invite = pending[senderId];
				const profile = await getProfile(senderId, token).catch(() => null);
				addFriend({
					userId: senderId,
					username: profile?.username ?? invite?.senderUsername ?? senderId,
					avatar: profile?.avatar ?? invite?.senderAvatar ?? '',
					isOnline: profile?.isOnline ?? false,
				} satisfies FriendEntry);
				showFeedback(t('friendAdded'), true);
			}
			removePending(senderId);
			dismiss(senderId);
		} catch {
			showFeedback(t('actionFailed'), false);
		}
	};

	const handleRemove = async (friendId: string) => {
		if (!token) return;
		try {
			await removeFriend(friendId, token);
			removeFriendStore(friendId);
		} catch {
			showFeedback(t('failedToRemove'), false);
		}
	};

	const handleCancelRequest = async (receiverId: string) => {
		if (!token) return;
		try {
			await cancelFriendRequest(receiverId, token);
			removeSentRequest(receiverId);
		} catch {
			showFeedback(t('failedToCancel'), false);
		}
	};

	const handleAcceptMatch = async (matchId: string) => {
		if (!token) return;
		try {
			const result = await acceptMatch(matchId, token);
			removeMatchInvite(matchId);
			dismiss(matchId);
			if ('id' in result) navigate(`/game/${result.id}`);
		} catch {
			showFeedback(t('failedToAccept'), false);
		}
	};

	const handleRejectMatch = async (matchId: string) => {
		if (!token) return;
		try {
			await rejectMatch(matchId, token);
			removeMatchInvite(matchId);
			dismiss(matchId);
		} catch {
			showFeedback(t('failedToReject'), false);
		}
	};

	return (
		<div className='bg-purple-950 rounded-xl shadow-lg w-56 flex flex-col gap-3 p-3'>

			{/* FRIENDS LIST */}
			<div>
				<h2 className='retro-title-sm mb-1 p-2'>
					{t('friendsTitle', { count: Object.keys(friends).length })}
				</h2>
				{Object.keys(friends).length === 0 ? (
					<p className='text-[13px] text-purple-400 text-center py-2'>{t('noFriends')}</p>
				) : (
					<div className='flex flex-col gap-1'>
						{Object.values(friends).map(entry => (
							<FriendItem
								key={entry.userId}
								entry={entry}
								onRemove={handleRemove}
								onPlayFromChild={(id, username, avatar) => onPlayToFather?.(id, username, avatar)}

							/>
						))}
					</div>
				)}
			</div>

			<div className='border-t border-purple-700' />

			{/* ADD FRIEND */}
			<div>
				<h2 className='retro-title-sm mb-1'>{t('addFriend')}</h2>
				<input
					className='input-sm mb-3 w-full'
					placeholder={t('searchPlaceholder')}
					value={searchInput}
					onChange={(e) => { setSearchInput(e.target.value); setSearchError(''); setSearchResult(null); setFeedback(null); }}
					onKeyDown={(e) => { if (e.key === 'Enter' && !searchLoading) handleSearch(); }}
				/>

				{searchError && (
					<p className='text-xs text-red-400 mt-1'>{searchError}</p>
				)}

				{/* FEEDBACK */}
				{feedback && (
					<p className={`text-xs mt-1 ${feedback.ok ? 'text-green-400' : 'text-red-400'}`}>
						{feedback.msg}
					</p>
				)}

				{searchResult && (
					<div className='flex items-center justify-between mt-2 p-2 bg-purple-900 rounded-lg'>
						<div className='flex items-center gap-2 min-w-0'>
							<AvatarDisplay src={searchResult.avatar} size='sm' />
							<span className='text-[10px] text-purple-200 truncate' title={searchResult.username}>
								{searchResult.username}
							</span>
						</div>
						<button
							onClick={() => handleSendRequest(searchResult.id)}
							className='arcade-btn-sm shrink-0 ml-2'
						>
							{tCommon('add')}
						</button>
					</div>
				)}
			</div>

			{/* FRIEND REQUEST */}
			{Object.keys(pending).length > 0 && (
				<>
					<div className='border-t border-purple-700' />
					<div>
						<h2 className='retro-title-sm mb-1'>
							{t('requestsTitle', { count: Object.keys(pending).length })}
						</h2>
						<div className='flex flex-col gap-1'>
							{Object.values(pending).map(req => (
								<div key={req.senderId} className='flex items-center justify-between p-2 bg-purple-900 rounded-lg'>
									<div className='flex items-center gap-2 min-w-0'>
										<AvatarDisplay src={req.senderAvatar} size='sm' />
										<span className='text-[10px] text-purple-200 truncate' title={req.senderUsername}>
											{req.senderUsername}
										</span>
									</div>
									<div className='flex flex-col items-end gap-1 shrink-0 ml-2'>
										<button
											onClick={() => handleRespond(req.senderId, false)}
											className='text-[10px] text-red-400 hover:text-red-200 px-2'
										>
											{tCommon('reject')}
										</button>
										<button
											onClick={() => handleRespond(req.senderId, true)}
											className='arcade-btn-sm'
										>
											{tCommon('accept')}
										</button>
									</div>
								</div>
							))}
						</div>
					</div>
				</>
			)}

			{/* SENT REQUESTS */}
			{Object.keys(sentRequests).length > 0 && (
				<>
					<div className='border-t border-purple-700' />
					<div>
						<h2 className='retro-title-sm mb-1'>
							{t('sentTitle', { count: Object.keys(sentRequests).length })}
						</h2>
						<div className='flex flex-col gap-1'>
							{Object.values(sentRequests).map(req => (
								<div key={req.receiverId} className='flex items-center justify-between p-2 bg-purple-900 rounded-lg'>
									<div className='flex items-center gap-2 min-w-0'>
										<AvatarDisplay src={req.receiverAvatar} size='sm' />
										<span className='text-[10px] text-purple-200 truncate' title={req.receiverUsername}>
											{req.receiverUsername}
										</span>
									</div>
									<button
										onClick={() => handleCancelRequest(req.receiverId)}
										className='text-[10px] text-red-400 hover:text-red-200 px-2 shrink-0 ml-2'
									>
										{tCommon('cancel')}
									</button>
								</div>
							))}
						</div>
					</div>
				</>
			)}

			{/* MATCH REQUESTS */}
			{Object.keys(matchInvites).length > 0 && (
				<>
					<div className='border-t border-purple-700' />
					<div>
						<h2 className='retro-title-sm mb-1'>
							{t('matchRequestTitle', { count: Object.keys(matchInvites).length })}
						</h2>
						<div className='flex flex-col gap-1'>
							{Object.values(matchInvites).map(inv => (
								<div key={inv.matchId} className='flex items-center justify-between p-2 bg-purple-900 rounded-lg relative overflow-hidden'>
									<div className='flex items-center gap-2 min-w-0'>
										<AvatarDisplay src={inv.inviterAvatar} size='sm' />
										<div className='flex flex-col min-w-0'>
											<span className='text-[10px] text-purple-200 truncate' title={inv.inviterUsername}>
												{inv.inviterUsername}
											</span>
											<span className='text-[9px] text-purple-400'>{inv.gameMode}</span>
										</div>
									</div>
									<div className='flex flex-col items-end gap-1 shrink-0 ml-2'>
										<button
											onClick={() => handleRejectMatch(inv.matchId)}
											className='text-[10px] text-red-400 hover:text-red-200 px-2'
										>
											{tCommon('reject')}
										</button>
										<button
											onClick={() => handleAcceptMatch(inv.matchId)}
											className='arcade-btn-sm'
										>
											{tCommon('accept')}
										</button>
									</div>
									<TimeoutBar
										active={!!inv.expiresAt}
										durationMs={inv.expiresAt ? Math.max(0, inv.expiresAt - Date.now()) : 0}
										color='bg-cyan-400'
										height='h-[1px]'
									/>
								</div>
							))}
						</div>
					</div>
				</>
			)}

		</div>
	);
}
