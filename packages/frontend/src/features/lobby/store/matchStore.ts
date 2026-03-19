import { create } from 'zustand';

type MatchEvent = 
	| { type: 'found';			matchId: string }
	| { type: 'started';		matchId: string }
	| { type: 'queue_timeout';	reason: string  }
	| { type: 'friend_rejected'	 }
	| { type: 'friend_expired'	 }
	| { type: 'friend_cancelled' };

interface MatchStore {
	/** Evento pendiente de procesar por LobbyPage */
	pendingEvent: MatchEvent | null;
	setPendingEvent: (event: MatchEvent) => void;
	clearPendingEvent: () => void;
}

export const useMatchStore = create<MatchStore>((set) => ({
	pendingEvent: null,
	setPendingEvent: (event) => set({ pendingEvent: event }),
	clearPendingEvent: () => set({ pendingEvent: null }),
}));