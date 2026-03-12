import { useCallback } from 'react';
import { WEBSOCKET_EVENTS } from '@transcendence/shared/constants/event.constants.js';
import type { WebSocketEventsTypes } from '@transcendence/shared/types/event.types.js';
import { AppRouter } from './core/router/AppRouter';
import { 
	TOAST_BUTTON_STYLE, 
	TOAST_TYPE, 
	ToastContainer, 
	useToastStore,
} from './core/toasts';
import { useAuthStore } from './core/auth/AuthStore';
import { useWebSocket } from './core/ws/useWebSocket';
import { getFriendships, respondFriendRequest } from './features/friends/api/friendsApi';
import { FRIENDSHIP_STATUS } from '@transcendence/shared/constants/friendship.constants.js';
import { getProfile } from './features/profile/api/profileApi';
import { useFriendsStore, FriendEntry } from './features/friends/store/friendsStore';

export default function App() {
	const token = useAuthStore((state) => state.accessToken);
	const currentUserId = useAuthStore((state) => state.user?.id); 

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
				.filter(friend => friend.initiatorId !== currentUserId)
				.map(friend => ({ initiatorId: friend.initiatorId, userId: friend.userId, friendId: friend.friendId }));
			setPending(incomingPending);
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
			addFriend({ userId: senderId, username: senderUsername, avatar: senderAvatar, isOnline: true });
			removePending(senderId);
			dismiss(senderId);
		} catch {
			error('Failed to accept request');
		} 
	}, [token, addFriend, removePending, error, dismiss]);

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

	const handleWsMessage = useCallback((msg: WebSocketEventsTypes.AnyWsMessage) => {
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
					initiatorId: msg.payload.senderId,
					userId: msg.payload.senderId,
					friendId: msg.payload.senderId
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
				addFriend({
					userId: msg.payload.acceptorId,
					username: msg.payload.acceptorUsername,
					avatar: msg.payload.acceptorAvatar,
					isOnline: true,
				});
				success(`${msg.payload.acceptorUsername} is now your friend`);
				break;
	
			case WEBSOCKET_EVENTS.FRIEND_REMOVE:
				removeFriend(msg.payload.removerId);
				warning('A frindship has ended');
				break;
			
			default: break
		}
	}, [
		handleAcceptFriend,	handleRejectFriend,	setOnline,
		updateProfile,		addFriend,			addPending,
		removeFriend,		removePending,		info,
		success,			warning,			action
	]);

	useWebSocket({ onMessage: handleWsMessage, onConnect: loadFriendships });

	return (
		<>
			<AppRouter />
			<ToastContainer />
		</>
	);
}