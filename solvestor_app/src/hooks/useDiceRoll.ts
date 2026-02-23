// ============================================================
// Dice Roll Hook — Solvestor (SWS)
// ============================================================
// Encapsulates dice rolling logic, coordinates with game + UI stores.
// Waits for physics-based dice settling signal instead of fixed timer.
// ============================================================

import { useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { useUIStore } from '@/stores/useUIStore';
import { useCameraStore } from '@/stores/useCameraStore';
import { TOKEN_STEP_DURATION } from '@/config/game';
import { TILES } from '@/config/tiles';

export function useDiceRoll() {
    const rollDice = useGameStore((s) => s.rollDice);
    const movePlayer = useGameStore((s) => s.movePlayer);
    const setPhase = useGameStore((s) => s.setPhase);
    const getCurrentPlayer = useGameStore((s) => s.getCurrentPlayer);
    const setDiceAnimating = useUIStore((s) => s.setDiceAnimating);
    const isDiceSettled = useUIStore((s) => s.isDiceSettled);
    const zoomOnLand = useCameraStore((s) => s.zoomOnLand);
    const showPopup = useUIStore((s) => s.showPopup);
    const ownedTiles = useGameStore((s) => s.ownedTiles);

    // Store the pending roll result so we can continue after settlement
    const pendingResult = useRef<{ playerId: string; total: number } | null>(null);

    const performRoll = useCallback(() => {
        const player = getCurrentPlayer();
        if (!player) return;

        // 1. Roll dice — sets phase to 'rolling' and triggers DiceScene
        const result = rollDice();
        setDiceAnimating(true);

        // Store result for when dice settle
        pendingResult.current = { playerId: player.id, total: result.total };
    }, [rollDice, getCurrentPlayer, setDiceAnimating]);

    // 2. Watch for dice to settle (physics-based signal from DiceScene)
    useEffect(() => {
        if (!isDiceSettled || !pendingResult.current) return;

        const { playerId, total } = pendingResult.current;
        pendingResult.current = null;

        // Dice have settled — proceed with token movement
        setDiceAnimating(false);
        movePlayer(playerId, total);
        setPhase('moving');

        // 3. After token finishes moving, handle landing
        const moveDuration = total * TOKEN_STEP_DURATION * 1000;
        setTimeout(() => {
            const updatedPlayer = getCurrentPlayer();
            const landedTileIndex = updatedPlayer.position;
            const landedTile = TILES[landedTileIndex];

            setPhase('landed');
            zoomOnLand(landedTileIndex);

            // 4. After camera zoom, show action popup
            setTimeout(() => {
                setPhase('action');

                // Determine action based on tile type
                if (landedTile.category === 'property' || landedTile.category === 'utility') {
                    const owner = ownedTiles[landedTileIndex];
                    if (!owner) {
                        showPopup('buy', landedTileIndex);
                    } else if (owner !== playerId) {
                        showPopup('rent', landedTileIndex);
                    } else {
                        // Own tile — no action needed, auto end turn
                        setPhase('turnEnd');
                    }
                } else if (landedTile.category === 'event') {
                    showPopup('event', landedTileIndex);
                } else if (landedTile.category === 'tax') {
                    showPopup('tax', landedTileIndex);
                } else if (landedTile.category === 'corner') {
                    showPopup('corner', landedTileIndex);
                }
            }, 800);
        }, moveDuration + 300);
    }, [
        isDiceSettled,
        movePlayer,
        setPhase,
        getCurrentPlayer,
        setDiceAnimating,
        zoomOnLand,
        showPopup,
        ownedTiles,
    ]);

    return { performRoll };
}
