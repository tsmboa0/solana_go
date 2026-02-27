// ============================================================
// Coin Confetti Store — Solvestor (SWS)
// ============================================================
// Global store for triggering coin splash animations.
// Red coins = debit, Green coins = credit.
// ============================================================

import { create } from 'zustand';

export interface CoinEffect {
    id: string;
    amount: number;
    type: 'credit' | 'debit';
    message: string;
    createdAt: number;
}

interface CoinConfettiState {
    effects: CoinEffect[];
    showCoinEffect: (amount: number, type: 'credit' | 'debit', message: string) => void;
    removeEffect: (id: string) => void;
    clearEffects: () => void;
}

export const useCoinConfetti = create<CoinConfettiState>()((set) => ({
    effects: [],

    showCoinEffect: (amount, type, message) => {
        const effect: CoinEffect = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            amount,
            type,
            message,
            createdAt: Date.now(),
        };
        set((state) => ({ effects: [...state.effects, effect] }));

        // Auto-remove after animation duration
        setTimeout(() => {
            set((state) => ({
                effects: state.effects.filter((e) => e.id !== effect.id),
            }));
        }, 2500);
    },

    removeEffect: (id) => {
        set((state) => ({
            effects: state.effects.filter((e) => e.id !== id),
        }));
    },

    clearEffects: () => set({ effects: [] }),
}));
