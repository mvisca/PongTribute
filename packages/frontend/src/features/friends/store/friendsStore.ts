import { create } from 'zustand';

export interface FriendEntry {
	userId: string;
	username: string;
	avatar: string;
	isOnline: boolean;
}

export interface FriendInvite {
	senderId: string;
	senderUsername: string;
	senderAvatar: string;
}

export interface SentRequest {
	receiverId: string;
	receiverUsername: string;
	receiverAvatar: string;
}

export interface MatchInviteEntry {
	matchId: string;
	inviterId: string;
	inviterUsername: string;
	inviterAvatar: string;
	gameMode: string;
	expiresAt?: number;
}

interface FriendsState {
	// Accepted friends
	friends: Record<string, FriendEntry>
	// Pending incoming requests (key=senderId)
	pending: Record<string, FriendInvite>
	// Pending match invitations (key=matchId)
	matchInvites: Record<string, MatchInviteEntry>
	// Outgoing pending requests (key=receiverId)
	sentRequests: Record<string, SentRequest>
	// Actions
	setFriends: (entries: FriendEntry[]) => void;
	setPending: (entries: Array<FriendInvite>) => void;
	setOnline: (userId: string, isOnline: boolean) => void;
	updateProfile: (userId: string, username: string, avatar: string) => void;
	addFriend: (entry: FriendEntry) => void;
	addPending: (entry: FriendInvite) => void;
	removeFriend: (userId: string) => void;
	removePending: (userId: string) => void;
	addMatchInvite: (entry: MatchInviteEntry) => void;
	removeMatchInvite: (matchId: string) => void;
	setSentRequests: (entries: SentRequest[]) => void;
	addSentRequest: (entry: SentRequest) => void;
	removeSentRequest: (receiverId: string) => void;
	reset: () => void;
}

const EMPTY: FriendsState['friends'] = {};
const EMPTY_PENDING: FriendsState['pending'] = {};
const EMPTY_MATCH_INVITES: FriendsState['matchInvites'] = {};
const EMPTY_SENT: FriendsState['sentRequests'] = {};

export const useFriendsStore = create<FriendsState>((set) => ({
	friends: EMPTY,
	pending: EMPTY_PENDING,
	matchInvites: EMPTY_MATCH_INVITES,
	sentRequests: EMPTY_SENT,

	setFriends: (entries) =>
		set({ friends: Object.fromEntries(entries.map(e => [e.userId, e])) }),

	setPending: (entries) =>
		set({ pending: Object.fromEntries(entries.map(e => [e.senderId, e])) }),

	setOnline: (userId, isOnline) => 
		set((state) => {
			const entry = state.friends[userId];
			if (!entry) return state;
			return { friends: { ...state.friends, [userId]: { ...entry, isOnline }}}
		}),

	updateProfile: (userId, username, avatar) =>
		set((state) => {
			const entry = state.friends[userId];
			if (!entry) return state;
			return { friends: { ...state.friends, [entry.userId]: { ...entry, username, avatar }}};
		}),
	
	addFriend: (entry) =>
		set((state) => ({ friends: { ...state.friends, [entry.userId]: entry } })),

	addPending: (entry) =>
		set((state) => ({ pending: { ...state.pending, [entry.senderId]: entry } })),

	removeFriend: (userId) =>
		set((state) => {
			const next = { ...state.friends };
			delete next[userId];
			return { friends: next };
		}),
	
	removePending: (initiatorId) =>
		set((state) => {
			const next = { ...state.pending };
			delete next[initiatorId];
			return { pending: next };
		}),
	
	addMatchInvite: (entry) =>
		set((state) => ({ matchInvites: { ...state.matchInvites, [entry.matchId]: entry } })),

	removeMatchInvite: (matchId) =>
		set((state) => {
			const next = { ...state.matchInvites };
			delete next[matchId];
			return { matchInvites: next };
		}),
	
		
	setSentRequests: (entries) =>
		set({ sentRequests: Object.fromEntries(entries.map(e => [e.receiverId, e])) }),
		
	addSentRequest: (entry) =>
		set((state) => ({ sentRequests: { ...state.sentRequests, [entry.receiverId]: entry } })),
		
	removeSentRequest: (receiverId) =>
		set((state) => {
			const next = { ...state.sentRequests };
			delete next[receiverId];
			return { sentRequests: next };
		}),
		
	reset: () => set({ friends: EMPTY, pending: EMPTY_PENDING, sentRequests: EMPTY_SENT, matchInvites: EMPTY_MATCH_INVITES }),

}));