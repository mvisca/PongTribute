import { create } from 'zustand';

export interface FriendEntry {
	userId: string;
	username: string;
	avatar: string;
	isOnline: boolean;
}

interface FriendsState {
	// Accepted friends
	friends: Record<string, FriendEntry>
	// Pending incoming requests (key=initiatorId)
	pending: Record<string, { initiatorId: string, userId: string, friendId: string }>

	// Actions
	setFriends: (entries: FriendEntry[]) => void;
	setPending: (entries: Array<{ initiatorId: string; userId: string; friendId: string }>) => void;
	setOnline: (userId: string, isOnline: boolean) => void;
	updateProfile: (userId: string, username: string, avatar: string) => void;
	addFriend: (entry: FriendEntry) => void;
	removeFriend: (userId: string) => void;
	removePending: (userId: string) => void;
	reset: () => void;
}

const EMPTY: FriendsState['friends'] = {};
const EMPTY_PENDING: FriendsState['pending'] = {};

export const useFriendsStore = create<FriendsState>((set) => ({
	friends: EMPTY,
	pending: EMPTY_PENDING,

	setFriends: (entries) =>
		set({ friends: Object.fromEntries(entries.map(e => [e.userId, e])) }),

	setPending: (entries) =>
		set({ pending: Object.fromEntries(entries.map(e => [e.initiatorId, e])) }),

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
	
	reset: () => set({ friends: EMPTY, pending: EMPTY_PENDING }),
}));