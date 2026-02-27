// ============================================================
// CPU Player Hook — Solvestor (SWS)
// ============================================================
// FULLY INDEPENDENT CPU player for Explore mode.
// Runs on its own setInterval timer — does NOT depend on
// turns, phases, or the human player's actions at all.
// The CPU rolls, moves, resolves tile actions via the mirror
// engine, and repeats on a loop.
// ============================================================

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { TILES } from '@/config/boardTiles';
import { TOKEN_STEP_DURATION, BOARD_SIZE } from '@/config/game';
import { predictTileAction, type PlayerLocalState } from '@/engine/tileActionMirror';

/** How often the CPU plays (ms between rolls) */
const CPU_LOOP_INTERVAL_MS = 12000;  // 12 seconds between rolls
/** Initial delay before CPU starts playing */
const CPU_INITIAL_DELAY_MS = 4000;   // 4 seconds after game start
/** Probability CPU will buy an available tile */
const CPU_BUY_PROBABILITY = 0.6;
/** Probability CPU will choose DeFi/Shield/Potion if affordable */
const CPU_CHOICE_PROBABILITY = 0.5;

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

                // Build player state for prediction
                const localPlayer: PlayerLocalState = {
                    id: updatedCPU.id,
                    balance: updatedCPU.balance,
                    hasShield: updatedCPU.hasShield ?? false,
                    hasStakedDefi: updatedCPU.hasStakedDefi ?? false,
                    hasPotion: updatedCPU.hasPotion ?? false,
                    isInGraveyard: updatedCPU.isInGraveyard ?? false,
                };

                const diceResult: [number, number] = [die1, die2];

                // Build property owners map
                const propertyOwners: Record<number, string> = {};
                for (const [key, value] of Object.entries(currentState.ownedTiles)) {
                    if (value) propertyOwners[Number(key)] = value;
                }

                // Predict the tile action outcome
                const result = predictTileAction(
                    landedTileIndex,
                    localPlayer,
                    diceResult,
                    propertyOwners,
                    landedTileIndex,
                );

                const fn = landedTile.tile_function;

                // ─── Ownable tiles: CPU buy/rent decision ───
                if (fn.action_type === 'ownable') {
                    const owner = currentState.ownedTiles[landedTileIndex];
                    if (!owner) {
                        if (Math.random() < CPU_BUY_PROBABILITY && updatedCPU.balance >= (fn.buy_price ?? 0)) {
                            currentState.buyTile(updatedCPU.id, landedTileIndex);
                        }
                    } else if (owner !== updatedCPU.id) {
                        currentState.payRent(updatedCPU.id, owner, fn.rent_value ?? 0);
                    }
                    return;
                }

                // ─── Choice tiles: CPU random decision ───
                if (result.requiresChoice && result.choiceOptions) {
                    const opt = result.choiceOptions[0];
                    if (opt && updatedCPU.balance >= opt.cost && Math.random() < CPU_CHOICE_PROBABILITY) {
                        // CPU chooses the option
                        const stateUpdate: any = {};
                        if (opt.id === 'stake_defi') stateUpdate.hasStakedDefi = true;
                        if (opt.id === 'buy_shield') stateUpdate.hasShield = true;
                        if (opt.id === 'buy_potion') stateUpdate.hasPotion = true;

                        currentState.updatePlayerFromChain(updatedCPU.id, {
                            balance: updatedCPU.balance - opt.cost,
                            ...stateUpdate,
                        });
                    }
                    // If skipping, the default balanceChange is applied below
                    return;
                }

                // ─── Auto-resolved tiles: apply balance + state changes ───
                if (result.balanceChange !== 0) {
                    currentState.updatePlayerFromChain(updatedCPU.id, {
                        balance: Math.max(0, updatedCPU.balance + result.balanceChange),
                    });
                }

                if (result.stateChanges) {
                    currentState.updatePlayerFromChain(updatedCPU.id, {
                        ...result.stateChanges,
                    });
                }

                // Handle teleportation
                if (result.newPosition !== undefined && result.newPosition !== updatedCPU.position) {
                    let teleportSteps: number;
                    if (result.newPosition >= updatedCPU.position) {
                        teleportSteps = result.newPosition - updatedCPU.position;
                    } else {
                        teleportSteps = (BOARD_SIZE - updatedCPU.position) + result.newPosition;
                    }
                    currentState.movePlayer(updatedCPU.id, teleportSteps);
                }
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
