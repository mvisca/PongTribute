import { create } from 'zustand';

export interface FriendEntry {
	userId: string;
	username: string;
	avatar: string;
	isOnline: boolean;
}

export interface FriendInvite { // TODO eliminar campos muertos?
	initiatorId: string;
	userId: string;
	friendId: string;
}

interface FriendsState {
	// Accepted friends
	friends: Record<string, FriendEntry>
	// Pending incoming requests (key=initiatorId)
	pending: Record<string, FriendInvite>

	// Actions
	setFriends: (entries: FriendEntry[]) => void;
	setPending: (entries: Array<FriendInvite>) => void;
	setOnline: (userId: string, isOnline: boolean) => void;
	updateProfile: (userId: string, username: string, avatar: string) => void;
	addFriend: (entry: FriendEntry) => void;
	addPending: (entry: FriendInvite) => void;
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

	addPending: (entry) =>
		set((state) => ({ pending: { ...state.pending, [entry.initiatorId]: entry } })),

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