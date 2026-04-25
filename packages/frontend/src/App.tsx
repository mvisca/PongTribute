import { useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { WEBSOCKET_EVENTS } from '@transcendence/shared/constants/event.constants.js';
import type { WebSocketEventsTypes } from '@transcendence/shared/types/event.types.js';
import { FRIENDSHIP_STATUS } from '@transcendence/shared/constants/friendship.constants.js';

import { AppRouter } from './core/router/AppRouter';
import { useAuthValidation } from './core/auth/useAuthValidation';
import { useWebSocket } from './core/ws/useWebSocket';
import { useAuthStore } from './core/auth/AuthStore';
import {
    ToastContainer,
    useToastStore,
} from './core/toasts';

import { getFriendships } from './features/friends/api/friendsApi';
import { useFriendsStore, FriendEntry, FriendInvite, SentRequest } from './features/friends/store/friendsStore';
import { getProfile } from './features/profile/api/profileApi';
import { useMatchStore } from './features/lobby/store/matchStore';

import { soundManager } from './features/game/audio/soundManager';

export default function App() {
    const { t } = useTranslation('toasts');
    const navigate = useNavigate();
    const location = useLocation();

    const token = useAuthStore((state) => state.accessToken);
    const currentUserId = useAuthStore((state) => state.user?.id);

    const activeMatchId = useMatchStore(state => state.activeMatchId);

    const info = useToastStore((state: ReturnType<typeof useToastStore.getState>) => state.info);
    const success = useToastStore((state: ReturnType<typeof useToastStore.getState>) => state.success);
    const warning = useToastStore((state: ReturnType<typeof useToastStore.getState>) => state.warning);

    const setFriends = useFriendsStore(state => state.setFriends);
    const setPending = useFriendsStore(state => state.setPending);
    const setOnline = useFriendsStore(state => state.setOnline);
    const updateProfile = useFriendsStore(state => state.updateProfile);
    const addFriend = useFriendsStore(state => state.addFriend);
    const addPending = useFriendsStore(state => state.addPending);
    const removeFriend = useFriendsStore(state => state.removeFriend);
    const removePending = useFriendsStore(state => state.removePending);
    const setSentRequests = useFriendsStore(state => state.setSentRequests);
    const removeSentRequest = useFriendsStore(state => state.removeSentRequest);

    const addMatchInvite = useFriendsStore(state => state.addMatchInvite);
    const removeMatchInvite = useFriendsStore(state => state.removeMatchInvite);


    const loadFriendships = useCallback(async () => {
        if (!token) return;

        try {
            const [acceptedRes, pendingRes] = await Promise.all([
                getFriendships(token, FRIENDSHIP_STATUS.ACCEPTED),
                getFriendships(token, FRIENDSHIP_STATUS.PENDING),
            ]);

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

            const outgoingPending = pendingRes.friendships
                .filter(friend => friend.initiatorId === currentUserId);
            const enrichedSent = await Promise.all(
                outgoingPending.map(async (friend) => {
                    const receiverId = friend.userId === currentUserId ? friend.friendId : friend.userId;
                    const profile = await getProfile(receiverId, token).catch(() => null);
                    return {
                        receiverId,
                        receiverUsername: profile?.username ?? receiverId,
                        receiverAvatar: profile?.avatar ?? '',
                    } satisfies SentRequest;
                })
            );
            setSentRequests(enrichedSent);

        } catch { };
    }, [token, currentUserId, setFriends, setPending, setSentRequests]);

    const handleWsMessage = useCallback(async (msg: WebSocketEventsTypes.AnyWsMessage) => {
        switch (msg.type) {
            case WEBSOCKET_EVENTS.FRIEND_ONLINE:
                setOnline(msg.payload.userId, true);
                info(t('friendOnline', { name: msg.payload.username }));
                break;

            case WEBSOCKET_EVENTS.FRIEND_OFFLINE:
                setOnline(msg.payload.userId, false);
                info(t('friendOffline', { name: msg.payload.username }));
                break;

            case WEBSOCKET_EVENTS.FRIEND_PROFILE_UPDATED:
                updateProfile(msg.payload.userId, msg.payload.username, msg.payload.avatar);
                break;

            case WEBSOCKET_EVENTS.FRIEND_REQUEST:
                addPending({
                    senderId: msg.payload.senderId,
                    senderUsername: msg.payload.senderUsername,
                    senderAvatar: msg.payload.senderAvatar,
                });
                info(t('friendRequest', { name: msg.payload.senderUsername }));
                break;

            case WEBSOCKET_EVENTS.FRIEND_ACCEPT:
                if (currentUserId === msg.payload.acceptorId) {
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
                const profile = await getProfile(msg.payload.acceptorId, token!)
                    .catch(() => null);
                addFriend({
                    userId: msg.payload.acceptorId,
                    username: profile?.username ?? msg.payload.acceptorUsername,
                    avatar: profile?.avatar ?? msg.payload.acceptorAvatar,
                    isOnline: profile?.isOnline ?? true,
                });
                success(t('friendAccepted', { name: msg.payload.acceptorUsername }));
                removeSentRequest(msg.payload.acceptorId);
                break;

            case WEBSOCKET_EVENTS.FRIEND_REMOVE:
                removeFriend(msg.payload.removerId);
                break;

            case WEBSOCKET_EVENTS.FRIEND_REQUEST_CANCEL:
                removePending(msg.payload.cancellerId);
                break;

            case WEBSOCKET_EVENTS.FRIEND_REQUEST_DECLINED:
                removeSentRequest(msg.payload.declinerId);
                break;

            case WEBSOCKET_EVENTS.MATCH_INVITE:
                addMatchInvite({
                    matchId: msg.payload.matchId,
                    inviterId: msg.payload.inviterId,
                    inviterUsername: msg.payload.inviterUsername,
                    inviterAvatar: msg.payload.inviterAvatar,
                    gameMode: msg.payload.gameMode,
                    expiresAt: msg.payload.expiresAt,
				});
				soundManager.matchInvite();
                info(t('matchInvite', { name: msg.payload.inviterUsername }));
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
                warning(t('matchRejected', { name: msg.payload.rejectorUsername }));
                break;

            case WEBSOCKET_EVENTS.MATCH_CANCELLED:
                removeMatchInvite(msg.payload.matchId);
                if (msg.payload.reason === 'invitation_expired') {
                    useMatchStore.getState().setPendingEvent({ type: 'friend_expired' });
                } else {
                    useMatchStore.getState().setPendingEvent({ type: 'friend_cancelled' });
                    warning(t('matchCancelled'));
                }
                break;

            default:
                break;
        }
    }, [
        setOnline,
        updateProfile,      addFriend,          addPending,
        removeFriend,       removePending,      info,
        success,            warning,            removeSentRequest,
        addMatchInvite,     removeMatchInvite,  t
    ]);

    const { isValidating } = useAuthValidation();

    useWebSocket({ onMessage: handleWsMessage, onConnect: loadFriendships });

    useEffect(() => {
        if (!activeMatchId) return;
        if (location.pathname === `/game/${activeMatchId}`) return;
        if (!token) return;

        navigate(`/game/${activeMatchId}`, { replace: true });
    }, [activeMatchId, location.pathname, navigate, token]);

    return (
        <>
            <AppRouter />
            <ToastContainer />
        </>
    );
}