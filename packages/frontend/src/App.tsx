import { useCallback } from 'react';
import { WEBSOCKET_EVENTS } from '@transcendence/shared/constants/event.constants.js';
import type { WebSocketEventsTypes } from '@transcendence/shared/types/event.types.js';
import { AppRouter } from './core/router/AppRouter';
import { 
	TOAST_BUTTON_STYLE, 
	TOAST_TYPE, 
	ToastContainer, 
	useToastStore
} from './core/toasts';
import { useAuth } from './core/auth/AuthContext';
import { useCommsSocket } from './core/comms/useCommsSocket';
import { respondFriendRequest } from './features/friends/api/friendsApi';

export default function App() {
	const { info, success, warning, action } = useToastStore();
	const token = useAuth((state) => state.accessToken);

	const handleAcceptFriend = useCallback((senderId: string) => {
		if (!token) return;
		respondFriendRequest(senderId, true, token).catch(() => {});
	}, [token]);

	const handleRejectFriend = useCallback((senderId: string) => {
		if (!token) return;
		respondFriendRequest(senderId, false, token).catch(() => {});
	}, [token]);

	const handleWsMessage = useCallback((msg: WebSocketEventsTypes.AnyWsMessage) => {
		switch (msg.type) {
			// Social presence
			case WEBSOCKET_EVENTS.FRIEND_ONLINE:
				info(`${msg.payload.username} just connected`);
				break;
			
			case WEBSOCKET_EVENTS.FRIEND_OFFLINE:
				info(`${msg.payload.username} just disconnected`);
				break;
	
			// Friendship
			case WEBSOCKET_EVENTS.FRIEND_REQUEST:
				action({
					type: TOAST_TYPE.INFO,
					message: `${msg.payload.senderUsername} wants to be your friend`,
					duration: 0,
					actions: [ 
						{ label: 'Accept', onClick: () => handleAcceptFriend(msg.payload.senderId), style: TOAST_BUTTON_STYLE.PRIMARY },
						{ label: 'Reject', onClick: () => handleRejectFriend(msg.payload.senderId), style: TOAST_BUTTON_STYLE.DANGER }
					]
				})
				break;
	
			case WEBSOCKET_EVENTS.FRIEND_ACCEPT:
				success(`${msg.payload.acceptorUsername} is now your friend`);
				break;
	
			case WEBSOCKET_EVENTS.FRIEND_REMOVE:
				warning('A frindship has reached to an end');
				break;
			
			default: break
		}
	}, [handleAcceptFriend, handleRejectFriend, info, success, warning, action]);

	useCommsSocket(handleWsMessage);

	return (
		<>
			<AppRouter />
			<ToastContainer />
		</>
	);
}