// Zustand con 'muted' persistido
// soundStore persiste muted en localStorage y sincroniza soundManager 
// al arrancar y en cada toggle.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { soundManager } from '../../features/game/audio/soundManager';

interface SoundStore {
    muted: boolean;
    toggleMute: () => void;
}

export const useSoundStore = create<SoundStore>()(
    persist(
        (set) => ({
            muted: false,
            toggleMute: () => set((state) => {
                const newMuted = !state.muted;
                soundManager.setMuted(newMuted);
                return { muted: newMuted };
            }),
        }),
        { name: 'sound-store' }
    )
);

// Sincroniza soundManager con el valor persistido al arrancar la app
soundManager.setMuted(useSoundStore.getState().muted);