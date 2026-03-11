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
import { useAuth } from './core/auth/AuthContext';
import { useCommsSocket } from './core/comms/useCommsSocket';
import { respondFriendRequest } from './features/friends/api/friendsApi';
import { useFriendsStore } from './features/friends/store/friendsStore';

export default function App() {
	const info = useToastStore((state: ReturnType<typeof useToastStore.getState>) => state.info);
	const error = useToastStore((state: ReturnType<typeof useToastStore.getState>) => state.error);
	const success = useToastStore((state: ReturnType<typeof useToastStore.getState>) => state.success);
	const warning = useToastStore((state: ReturnType<typeof useToastStore.getState>) => state.warning);
	const action = useToastStore((state: ReturnType<typeof useToastStore.getState>) => state.action);
	
	const setOnline = useFriendsStore(state => state.setOnline);
	const updateProfile = useFriendsStore(state => state.updateProfile);
	const addFriend = useFriendsStore(state => state.addFriend);
	const addPending = useFriendsStore(state => state.addPending);
	const removeFriend = useFriendsStore(state => state.removeFriend);
	const removePending = useFriendsStore(state => state.removePending);

	const token = useAuth((state) => state.accessToken);

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
		} catch {
			error('Failed to accept request');
		}
	}, [token, addFriend, removePending, error]);

	const handleRejectFriend = useCallback(async (senderId: string) => {
		if (!token) return;
		try {
			await respondFriendRequest(senderId, false, token);
			removePending(senderId);
		} catch {
			error('Failed to reject request');
		}
	}, [token, removePending, error]);

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

	useCommsSocket(handleWsMessage);

	return (
		<>
			<AppRouter />
			<ToastContainer />
		</>
	);
}