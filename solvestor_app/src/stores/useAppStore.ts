// ============================================================
// App Store — Solvestor (SWS)
// ============================================================
// Top-level app state: game mode selection, navigation context.
// Separate from game logic store.
// ============================================================

import { create } from 'zustand';

export type GameMode = 'explore' | 'beginner' | null;

interface AppState {
    /** Selected game mode */
    gameMode: GameMode;
    setGameMode: (mode: GameMode) => void;

    /** Reset to initial state */
    resetApp: () => void;
}

export const useAppStore = create<AppState>()((set) => ({
    gameMode: null,
    setGameMode: (mode) => set({ gameMode: mode }),

    resetApp: () => set({ gameMode: null }),
}));
