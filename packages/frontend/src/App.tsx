//packages/frontend/src/App.tsx
import { useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { WEBSOCKET_EVENTS } from '@transcendence/shared/constants/event.constants.js';
import type { WebSocketEventsTypes } from '@transcendence/shared/types/event.types.js';
import { FRIENDSHIP_STATUS } from '@transcendence/shared/constants/friendship.constants.js';

import { AppRouter } from './core/router/AppRouter';
import { useAuthValidation } from './core/auth/useAuthValidation';
import { useWebSocket } from './core/ws/useWebSocket';
import { useAuthStore } from './core/auth/AuthStore';
import { 
	TOAST_BUTTON_STYLE, 
	TOAST_TYPE, 
	ToastContainer, 
	useToastStore,
} from './core/toasts';

import { getFriendships, respondFriendRequest } from './features/friends/api/friendsApi';
import { useFriendsStore, FriendEntry, FriendInvite } from './features/friends/store/friendsStore';
import { getProfile } from './features/profile/api/profileApi';
import { useMatchStore } from './features/lobby/store/matchStore';
import { acceptMatch, rejectMatch } from './features/game/api/gameApi';

export default function App() {
	const navigate = useNavigate();
	const location = useLocation();

	const token = useAuthStore((state) => state.accessToken);
	const currentUserId = useAuthStore((state) => state.user?.id); 

	const activeMatchId = useMatchStore(state => state.activeMatchId);
	
	const info = useToastStore((state: ReturnType<typeof useToastStore.getState>) => state.info);
	const error = useToastStore((state: ReturnType<typeof useToastStore.getState>) => state.error);
	const success = useToastStore((state: ReturnType<typeof useToastStore.getState>) => state.success);
	const warning = useToastStore((state: ReturnType<typeof useToastStore.getState>) => state.warning);
	const action = useToastStore((state: ReturnType<typeof useToastStore.getState>) => state.action);
	const dismiss = useToastStore((state: ReturnType<typeof useToastStore.getState>) => state.dismiss);
	
	const setFriends = useFriendsStore(state => state.setFriends);
	const setPending = useFriendsStore(state => state.setPending);
	const setOnline = useFriendsStore(state => state.setOnline);
	const updateProfile = useFriendsStore(state => state.updateProfile);
	const addFriend = useFriendsStore(state => state.addFriend);
	const addPending = useFriendsStore(state => state.addPending);
	const removeFriend = useFriendsStore(state => state.removeFriend);
	const removePending = useFriendsStore(state => state.removePending);

	const loadFriendships = useCallback(async () => {
		if (!token) return;

		try {
			const [acceptedRes, pendingRes] = await Promise.all([
				getFriendships(token, FRIENDSHIP_STATUS.ACCEPTED),
				getFriendships(token, FRIENDSHIP_STATUS.PENDING),
			]);

			// Populate Friends with profile data
			const enriched = await Promise.all(
				acceptedRes.friendships.map(async (friend) => {
					const friendId = friend.userId === currentUserId ? friend.friendId : friend.userId;
					const profile = await getProfile(friendId, token).catch(() => null);
					return {
						userId: friendId,
						username: profile?.username ?? friendId,
						avatar: profile?.avatar ?? '',
						isOnline: profile?.isOnline ?? false,
					} satisfies FriendEntry;
				})
			);
			setFriends(enriched);

			// Incoming pending requests
			const incomingPending = pendingRes.friendships
				.filter(friend => friend.initiatorId !== currentUserId);
			const enrichedPending = await Promise.all(
				incomingPending.map(async (friend) => {
					const profile = await getProfile(friend.initiatorId, token).catch(() => null);
					return {
						senderId: friend.initiatorId,
						senderUsername: profile?.username ?? friend.initiatorId,
						senderAvatar: profile?.avatar ?? '',
					} satisfies FriendInvite;
				})
			);

			setPending(enrichedPending);
		} catch { };
	}, [token, currentUserId, setFriends, setPending]);

	const handleAcceptFriend = useCallback(async (
		senderId: string,
		senderUsername: string,
		senderAvatar: string
	) => {
		if (!token) return;
		try {
			await respondFriendRequest(senderId, true, token);
			removePending(senderId);
			const profile= await getProfile(senderId, token).catch(() => null);
			addFriend({ 
				userId: senderId,
				username: profile?.username ?? senderUsername,
				avatar: profile?.avatar ?? senderAvatar,
				isOnline: profile?.isOnline ?? false
			} satisfies FriendEntry);
			dismiss(senderId);
		} catch {
			error('Failed to accept request');
		} 
	}, [token, error, dismiss, removePending, addFriend]);

	const handleRejectFriend = useCallback(async (senderId: string) => {
		if (!token) return;
		try {
			await respondFriendRequest(senderId, false, token);
			removePending(senderId);
			dismiss(senderId);
		} catch {
			error('Failed to reject request');
		}
	}, [token, removePending, error, dismiss]);

	const handleWsMessage = useCallback(async (msg: WebSocketEventsTypes.AnyWsMessage) => {
		switch (msg.type) {
			// Social presence
			case WEBSOCKET_EVENTS.FRIEND_ONLINE:
				setOnline(msg.payload.userId, true);
				info(`${msg.payload.username} is online`);
				break;
			
			case WEBSOCKET_EVENTS.FRIEND_OFFLINE:
				setOnline(msg.payload.userId, false);
				info(`${msg.payload.username} is offline`);
				break;

			case WEBSOCKET_EVENTS.FRIEND_PROFILE_UPDATED:
				updateProfile(msg.payload.userId, msg.payload.username, msg.payload.avatar);
				break;

			// Friendship
			case WEBSOCKET_EVENTS.FRIEND_REQUEST:
				addPending({
					senderId: msg.payload.senderId,
					senderUsername: msg.payload.senderUsername,
					senderAvatar: msg.payload.senderAvatar,
				});
				action({
					id: msg.payload.senderId,
					type: TOAST_TYPE.INFO,
					message: `${msg.payload.senderUsername} wants to be your friend`,
					duration: 0,
					actions: [{ 
						label: 'Accept',
						onClick: () => handleAcceptFriend(
							msg.payload.senderId,
							msg.payload.senderUsername,
							msg.payload.senderAvatar
						),
						style: TOAST_BUTTON_STYLE.PRIMARY
					}, {
						label: 'Reject',
						onClick: () => handleRejectFriend(
							msg.payload.senderId
						),
						style: TOAST_BUTTON_STYLE.DANGER
					}]
				});
				break;
	
			case WEBSOCKET_EVENTS.FRIEND_ACCEPT:
				if (currentUserId === msg.payload.acceptorId) {
					// Fallback for secondary tabs
					const friends = useFriendsStore.getState().friends;
					if (!friends[msg.payload.requesterId]) {
						const profile = await getProfile(msg.payload.requesterId, token!).catch(() => null);
						addFriend({
							userId: msg.payload.requesterId,
							username: profile?.username ?? msg.payload.requesterId,
							avatar: profile?.avatar ?? '',
							isOnline: profile?.isOnline ?? false,
						});
					}
					removePending(msg.payload.requesterId);
					break;
				}
				// For the REQUESTER
				const profile = await getProfile(msg.payload.acceptorId, token!)
					.catch(() => null);
				addFriend({
					userId: msg.payload.acceptorId,
					username: profile?.username ?? msg.payload.acceptorUsername,
					avatar: profile?.avatar ?? msg.payload.acceptorAvatar,
					isOnline: profile?.isOnline ?? true,
				});
				success(`${msg.payload.acceptorUsername} is now your friend`);
				break;
	
			case WEBSOCKET_EVENTS.FRIEND_REMOVE:
				removeFriend(msg.payload.removerId);
				warning('A friendship has ended');
				break;
			
			// Match events
			case WEBSOCKET_EVENTS.MATCH_INVITE:
				action({
					id: msg.payload.matchId,
					type: TOAST_TYPE.INFO,
					message: `${msg.payload.inviterUsername} challenges you to a ${msg.payload.gameMode} match`,
					duration: 0,
					expiresAt: msg.payload.expiresAt,
					actions: [
						{
							label: 'Accept',
							onClick: async () => {
								if (!token) return;
								try {
									const result = await acceptMatch(msg.payload.matchId, token);
									if ('id' in result) navigate(`/game/${result.id}`);
								} catch {
									error('Failed to accept invitation');
								}
							},
							style: TOAST_BUTTON_STYLE.PRIMARY
						},
						{
							label: 'Reject',
							onClick: async () => {
								if (!token) return;
								try { await rejectMatch(msg.payload.matchId, token); } catch {}
							},
							style: TOAST_BUTTON_STYLE.DANGER
						}
					]
				});
				break;
			
			case WEBSOCKET_EVENTS.MATCH_FOUND:
				useMatchStore.getState().setPendingEvent({
					type: 'found',
					matchId: msg.payload.matchId,
				});
				break;

			case WEBSOCKET_EVENTS.MATCH_QUEUE_TIMEOUT:
				useMatchStore.getState().setPendingEvent({
					type: 'queue_timeout',
					reason: msg.payload.reason,
				});
				break;

			case WEBSOCKET_EVENTS.MATCH_STARTED:
				useMatchStore.getState().setPendingEvent({
					type: 'started',
					matchId: msg.payload.matchId,
				});
				break;

			case WEBSOCKET_EVENTS.MATCH_REJECTED:
				useMatchStore.getState().setPendingEvent({ type: 'friend_rejected'});
				new Audio('/chicken.mp3').play().catch(() => {});
				warning('🐔: Friend rejected challenge'); 
				break;
			
			case WEBSOCKET_EVENTS.MATCH_CANCELLED:
				dismiss(msg.payload.matchId);
				if (msg.payload.reason === 'invitation_expired') {
					useMatchStore.getState().setPendingEvent({ type: 'friend_expired' });
				} else {
					// HOST_DISCONNECTED or HOST_CANCELLED
					useMatchStore.getState().setPendingEvent({ type: 'friend_cancelled' });
					warning('Match cancelled');
				}
				break;

			default:
				break;
		}
	}, [
		handleAcceptFriend,	handleRejectFriend,	setOnline,
		updateProfile,		addFriend,			addPending,
		removeFriend,		removePending,		info,
		success,			warning,			action,
		error,				dismiss,
	]);

	const { isValidating } = useAuthValidation();

	useWebSocket({ onMessage: handleWsMessage, onConnect: loadFriendships });

	// Keeps player in match
	useEffect(() => {
		if (!activeMatchId) return;
		if (location.pathname === `/game/${activeMatchId}`) return;
		// Only redirect atuhenticated users
		if (!token) return;

		// If user is in any differente path:
		navigate(`/game/${activeMatchId}`, { replace: true });
	}, [activeMatchId, location.pathname, navigate, token]);

	return (
		<>
			<AppRouter />
			<ToastContainer />
		</>
	);
}