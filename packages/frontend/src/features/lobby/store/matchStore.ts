import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
	activeMatchId: string | null;
	setPendingEvent: (event: MatchEvent) => void;
	clearPendingEvent: () => void;
	setActiveMatchId: (id: string) => void;
	clearActiveMatchId: () => void;
}

export const useMatchStore = create<MatchStore>()(
	persist(
		(set) => ({
			pendingEvent: null,
			activeMatchId: null,
			setPendingEvent: (event) => set({ pendingEvent: event }),
			clearPendingEvent: () => set({ pendingEvent: null }),
			setActiveMatchId: (id) => set({ activeMatchId: id }),
			clearActiveMatchId: () => set({ activeMatchId: null}),
		}),
		{
			name: 'match-store',
			// Only persist activeMatchId
			partialize: (state) => ({ activeMatchId: state.activeMatchId }),
		}
	)
);