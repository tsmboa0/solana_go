// ============================================================
// CPU Player Hook — Solvestor (SWS)
// ============================================================
// FULLY INDEPENDENT CPU player for Explore mode.
// Runs on its own setInterval timer — does NOT depend on
// turns, phases, or the human player's actions at all.
// The CPU rolls, moves, buys/pays, and repeats on a loop.
// ============================================================

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { TILES } from '@/config/boardTiles';
import { TOKEN_STEP_DURATION } from '@/config/game';

/** How often the CPU plays (ms between rolls) */
const CPU_LOOP_INTERVAL_MS = 12000;  // 12 seconds between rolls
/** Initial delay before CPU starts playing */
const CPU_INITIAL_DELAY_MS = 4000;   // 4 seconds after game start
/** Probability CPU will buy an available tile */
const CPU_BUY_PROBABILITY = 0.6;

export function useCPUPlayer() {
    const isExploreMode = useGameStore((s) => s.isExploreMode);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // Only in explore mode
        if (!isExploreMode) return;

        /**
         * Execute one CPU "turn" — completely independent of the game phase system.
         * Directly manipulates the CPU player's state in the store.
         */
        const playCPUTurn = () => {
            const state = useGameStore.getState();
            const cpuPlayer = state.players.find(p => p.isCPU);
            if (!cpuPlayer) return;

            // 1. Roll dice (math only)
            const die1 = Math.floor(Math.random() * 6) + 1;
            const die2 = Math.floor(Math.random() * 6) + 1;
            const total = die1 + die2;

            // 2. Move the CPU's token (triggers visual animation via useTokenMovement)
            state.movePlayer(cpuPlayer.id, total);

            // 3. After movement animation completes, resolve the action
            const moveDuration = total * TOKEN_STEP_DURATION * 1000 + 500;
            setTimeout(() => {
                // Re-read state after movement
                const currentState = useGameStore.getState();
                const updatedCPU = currentState.players.find(p => p.isCPU);
                if (!updatedCPU) return;

                const landedTileIndex = updatedCPU.position;
                const landedTile = TILES[landedTileIndex];
                if (!landedTile) return;

                const fn = landedTile.tile_function;

                // Handle tile actions
                if (fn.action_type === 'ownable') {
                    const owner = currentState.ownedTiles[landedTileIndex];
                    if (!owner) {
                        // Random buy decision
                        if (Math.random() < CPU_BUY_PROBABILITY && updatedCPU.balance >= (fn.buy_price ?? 0)) {
                            currentState.buyTile(updatedCPU.id, landedTileIndex);
                        }
                    } else if (owner !== updatedCPU.id) {
                        // Pay rent
                        currentState.payRent(updatedCPU.id, owner, fn.rent_value ?? 0);
                    }
                }
                // All other tile types: just skip (no action needed for CPU)
            }, moveDuration);
        };

        // Start the CPU loop after initial delay
        timeoutRef.current = setTimeout(() => {
            // Play first turn immediately
            playCPUTurn();

            // Then repeat on interval
            intervalRef.current = setInterval(playCPUTurn, CPU_LOOP_INTERVAL_MS);
        }, CPU_INITIAL_DELAY_MS);

        // Cleanup
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isExploreMode]);
}
