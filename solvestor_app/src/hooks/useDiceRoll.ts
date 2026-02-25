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
import { TOKEN_STEP_DURATION, POPUP_ACTION_DELAY_MS } from '@/config/game';
import { TILES } from '@/config/boardTiles';

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

            // 4. After camera zoom, wait for the configurable delay, then show action popup
            setTimeout(() => {
                setPhase('action');

                // Determine action based on tile type
                const fn = landedTile.tile_function;
                if (fn.action_type === 'ownable') {
                    const owner = ownedTiles[landedTileIndex];
                    if (!owner) {
                        showPopup('buy', landedTileIndex);
                    } else if (owner !== playerId) {
                        showPopup('rent', landedTileIndex);
                    } else {
                        // Own tile — no action needed, auto end turn
                        setPhase('turnEnd');
                    }
                } else if (fn.action_type === 'event') {
                    showPopup('event', landedTileIndex);
                } else if (fn.action_type === 'risk' || fn.action_type === 'defi') {
                    showPopup('tax', landedTileIndex);
                } else if (fn.action_type === 'corner') {
                    showPopup('corner', landedTileIndex);
                } else if (fn.action_type === 'neutral' || fn.action_type === 'privacy' || fn.action_type === 'governance') {
                    // For now, these might need dedicated popups, falling back to none
                    setPhase('turnEnd');
                }
            }, POPUP_ACTION_DELAY_MS);
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
