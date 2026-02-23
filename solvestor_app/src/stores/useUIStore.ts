// ============================================================
// UI Store — Solvestor (SWS)
// ============================================================
// Modal state, bottom sheet, popups, theme.
// Completely decoupled from game logic and rendering.
// ============================================================

import { create } from 'zustand';

export type ActivePopup = 'buy' | 'rent' | 'event' | 'tax' | 'corner' | null;

interface UIState {
    // --- Theme ---
    theme: 'dark' | 'light';
    toggleTheme: () => void;

    // --- Bottom Sheet (tile info) ---
    isBottomSheetOpen: boolean;
    bottomSheetTileId: number | null;
    openBottomSheet: (tileId: number) => void;
    closeBottomSheet: () => void;

    // --- Portfolio Modal ---
    isPortfolioOpen: boolean;
    portfolioPlayerId: string | null;
    openPortfolio: (playerId: string) => void;
    closePortfolio: () => void;

    // --- Action Popup (buy/rent/event after landing) ---
    activePopup: ActivePopup;
    popupTileId: number | null;
    showPopup: (type: ActivePopup, tileId: number) => void;
    closePopup: () => void;

    // --- Turn Banner ---
    showTurnBanner: boolean;
    setShowTurnBanner: (show: boolean) => void;

    // --- Dice animation state (for UI button) ---
    isDiceAnimating: boolean;
    setDiceAnimating: (animating: boolean) => void;

    // --- Dice settled signal (from physics engine) ---
    isDiceSettled: boolean;
    setDiceSettled: (settled: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
    // Theme
    theme: 'light',
    toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

    // Bottom Sheet
    isBottomSheetOpen: false,
    bottomSheetTileId: null,
    openBottomSheet: (tileId: number) =>
        set({ isBottomSheetOpen: true, bottomSheetTileId: tileId }),
    closeBottomSheet: () =>
        set({ isBottomSheetOpen: false, bottomSheetTileId: null }),

    // Portfolio
    isPortfolioOpen: false,
    portfolioPlayerId: null,
    openPortfolio: (playerId: string) =>
        set({ isPortfolioOpen: true, portfolioPlayerId: playerId }),
    closePortfolio: () =>
        set({ isPortfolioOpen: false, portfolioPlayerId: null }),

    // Action Popup
    activePopup: null,
    popupTileId: null,
    showPopup: (type: ActivePopup, tileId: number) =>
        set({ activePopup: type, popupTileId: tileId }),
    closePopup: () => set({ activePopup: null, popupTileId: null }),

    // Turn Banner
    showTurnBanner: false,
    setShowTurnBanner: (show: boolean) => set({ showTurnBanner: show }),

    // Dice animation
    isDiceAnimating: false,
    setDiceAnimating: (animating: boolean) => set({ isDiceAnimating: animating }),

    // Dice settled signal
    isDiceSettled: false,
    setDiceSettled: (settled: boolean) => set({ isDiceSettled: settled }),
}));
