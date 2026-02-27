// ============================================================
// Auto End Turn Hook — Solvestor (SWS)
// ============================================================
// In Explore mode, automatically ends the human's turn when
// phase reaches 'turnEnd'. Starts the cooldown timer.
// The CPU is fully independent and doesn't use this at all.
// ============================================================

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/stores/useGameStore';

/** Delay before auto-ending turn (gives a moment for the UI to breathe) */
const AUTO_END_DELAY_MS = 600;

export function useAutoEndTurn() {
    const phase = useGameStore((s) => s.phase);
    const endTurn = useGameStore((s) => s.endTurn);
    const startCooldown = useGameStore((s) => s.startCooldown);
    const isExploreMode = useGameStore((s) => s.isExploreMode);

    const isProcessing = useRef(false);

    useEffect(() => {
        // Only in explore mode, only when human's turn ends
        if (!isExploreMode) return;
        if (phase !== 'turnEnd') return;
        if (isProcessing.current) return;

        isProcessing.current = true;

        const timer = setTimeout(() => {
            // Start cooldown timer, then reset phase to waiting
            startCooldown();
            endTurn(); // In explore mode, this just resets phase — doesn't switch players
            isProcessing.current = false;
        }, AUTO_END_DELAY_MS);

        return () => {
            clearTimeout(timer);
            isProcessing.current = false;
        };
    }, [phase, isExploreMode, endTurn, startCooldown]);
}
