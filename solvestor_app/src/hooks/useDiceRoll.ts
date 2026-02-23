// ============================================================
// Dice Roll Hook — Solvestor (SWS)
// ============================================================
// Encapsulates dice rolling logic, coordinates with game + UI stores.
// ============================================================

import { useCallback } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { useUIStore } from '@/stores/useUIStore';
import { useCameraStore } from '@/stores/useCameraStore';
import { DICE_ROLL_DURATION, TOKEN_STEP_DURATION } from '@/config/game';
import { TILES } from '@/config/tiles';

export function useDiceRoll() {
    const rollDice = useGameStore((s) => s.rollDice);
    const movePlayer = useGameStore((s) => s.movePlayer);
    const setPhase = useGameStore((s) => s.setPhase);
    const getCurrentPlayer = useGameStore((s) => s.getCurrentPlayer);
    const setDiceAnimating = useUIStore((s) => s.setDiceAnimating);
    const zoomOnLand = useCameraStore((s) => s.zoomOnLand);
    const showPopup = useUIStore((s) => s.showPopup);
    const ownedTiles = useGameStore((s) => s.ownedTiles);

    const performRoll = useCallback(() => {
        const player = getCurrentPlayer();
        if (!player) return;

        // 1. Roll dice
        const result = rollDice();
        setDiceAnimating(true);

        // 2. After dice animation, start moving token
        setTimeout(() => {
            setDiceAnimating(false);
            movePlayer(player.id, result.total);
            setPhase('moving');

            // 3. After token finishes moving, handle landing
            const moveDuration = result.total * TOKEN_STEP_DURATION * 1000;
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
                        } else if (owner !== player.id) {
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
        }, DICE_ROLL_DURATION * 1000);
    }, [
        rollDice,
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
