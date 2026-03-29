// packages/frontend/src/features/friends/components/FriendsWidget.tsx
import { useState } from 'react';
import { useAuthStore } from '../../../core/auth/AuthStore';
import { useFriendsStore } from '../store/friendsStore';
import { sendFriendRequest, findUserByUsername, respondFriendRequest, removeFriend } from '../api/friendsApi';
import { getProfile } from '../../profile/api/profileApi';
import { FriendEntry } from '../store/friendsStore';
import { FriendItem } from './FriendItem';
import { AvatarDisplay } from '../../../shared/components/ui';
import { useToastStore } from '../../../core/toasts';

interface Props {
	onPlayToFather?: (friendId: string, friendUsername: string, friendAvatar: string) => void;
}

export function FriendsWidget( { onPlayToFather }: Props) {
    const token           = useAuthStore(state => state.accessToken);
    const currentUserId   = useAuthStore(state => state.user?.id);

    const friends         = useFriendsStore(state => state.friends);
    const pending         = useFriendsStore(state => state.pending);
    const removePending   = useFriendsStore(state => state.removePending);
    const removeFriendStore = useFriendsStore(state => state.removeFriend);
    const addFriend       = useFriendsStore(state => state.addFriend);
	
	const dismiss 		  = useToastStore(state => state.dismiss);

    const [searchInput,   setSearchInput]   = useState('');
    const [searchResult,  setSearchResult]  = useState<{ id: string; username: string; avatar: string } | null>(null);
    const [searchError,   setSearchError]   = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [feedback,      setFeedback]      = useState<{ msg: string; ok: boolean } | null>(null);
	

	const showFeedback = (msg: string, ok: boolean) => {
		setFeedback({ msg, ok });
		setTimeout(() => setFeedback(null), 3000);
	};

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
            showFeedback('Request sent!', true);
        } catch (err: any) {
            setSearchError(err?.message ?? 'Failed to send request');
        }
    };

    const handleRespond = async (senderId: string, accepted: boolean) => {
        if (!token) return;
        try {
            await respondFriendRequest(senderId, accepted, token);
            if (accepted) {
                const invite  = pending[senderId];
                const profile = await getProfile(senderId, token).catch(() => null);
                addFriend({
                    userId:   senderId,
                    username: profile?.username ?? invite?.senderUsername ?? senderId,
                    avatar:   profile?.avatar   ?? invite?.senderAvatar   ?? '',
                    isOnline: profile?.isOnline ?? false,
                } satisfies FriendEntry);
                showFeedback('Friend added!', true);
            }
			removePending(senderId);
			//dismiss(senderId);
			dismiss(senderId);
        } catch {
            showFeedback('Action failed', false);
        }
    };

    const handleRemove = async (friendId: string) => {
        if (!token) return;
        try {
            await removeFriend(friendId, token);
            removeFriendStore(friendId);
        } catch {
            showFeedback('Failed to remove friend', false);
        }
    };

    return (
        <div className='bg-purple-950 rounded-xl shadow-lg w-56 flex flex-col gap-3 p-3'>

            {/* FRIENDS LIST */}
            <div>
                <h2 className='retro-title-sm mb-1 p-2'>
                    FRIENDS ({Object.keys(friends).length})
                </h2>
                {Object.keys(friends).length === 0 ? (
                    <p className='text-[15px] text-purple-400 text-center py-2'>No friends yet</p>
                ) : (
                    <div className='flex flex-col gap-1'>
                        {Object.values(friends).map(entry => (
                            <FriendItem
                                key={entry.userId}
                                entry={entry}
                                onRemove={handleRemove}
                                onPlayFromChild={(id, username, avatar) => onPlayToFather?.(id, username, avatar)}
                                playLabel='PLAY'
                            />
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
                        onChange={(e) => { setSearchInput(e.target.value); setSearchError(''); setSearchResult(null); setFeedback(null); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !searchLoading) handleSearch(); }} // ← añadir
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

                {/* FEEDBACK ← añadir */}
                {feedback && (
                    <p className={`text-xs mt-1 ${feedback.ok ? 'text-green-400' : 'text-red-400'}`}>
                        {feedback.msg}
                    </p>
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
                            FRIEND REQUEST ({Object.keys(pending).length})
                        </h2>
                        <div className='flex flex-col gap-1'>
                            {Object.values(pending).map(req => (
                                <div key={req.senderId} className='flex items-center justify-between p-2 bg-purple-900 rounded-lg'>
                                    <div className='flex items-center gap-2'>
                                        <AvatarDisplay src={req.senderAvatar} size='sm' />
                                        <span className='text-[10px] text-purple-200'>{req.senderUsername}</span>
                                    </div>
                                    <div className='flex flex-col items-end gap-1'>
                                        <button
                                            onClick={() => handleRespond(req.senderId, false)}
                                            className='text-[10px] text-red-400 hover:text-red-200 px-2'
                                        >
                                            REJECT
                                        </button>
                                        <button
                                            onClick={() => handleRespond(req.senderId, true)}
                                            className='arcade-btn-sm'
                                        >
                                            ACCEPT
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