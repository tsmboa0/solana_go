// ============================================================
// Token Movement Hook — Solvestor (SWS)
// ============================================================
// Manages animated token movement tile-by-tile.
// Publishes current step tile to game store so camera can follow.
// ============================================================

import { useRef, useEffect, useState } from 'react';
import { TILE_LAYOUTS } from '@/utils/boardLayout';
import { BOARD_SIZE, TOKEN_STEP_DURATION, TOKEN_Y_OFFSET } from '@/config/game';
import { useGameStore } from '@/stores/useGameStore';
import { soundManager } from '@/utils/SoundManager';
import type { Vector3Tuple } from 'three';

interface TokenMovementState {
    /** Current interpolated world position */
    currentPosition: Vector3Tuple;
    /** Whether the token is currently animating */
    isMoving: boolean;
    /** Current tile being visited during animation */
    currentStepTile: number;
}

/**
 * Hook to animate a player token from one tile to another,
 * stepping through each intermediate tile.
 * Publishes the current step tile to the game store so
 * the camera controller can follow along tile-by-tile.
 */
export function useTokenMovement(
    playerPosition: number,
    isActivePlayer: boolean,
    isCPU: boolean = false,
): TokenMovementState {
    const previousPosition = useRef(playerPosition);
    const [isMoving, setIsMoving] = useState(false);
    const [currentStepTile, setCurrentStepTile] = useState(playerPosition);
    const [currentPosition, setCurrentPosition] = useState<Vector3Tuple>(
        getWorldPosition(playerPosition)
    );
    const setMovingTileIndex = useGameStore((s) => s.setMovingTileIndex);

    // When playerPosition changes, animate tile-by-tile
    useEffect(() => {
        const from = previousPosition.current;
        const to = playerPosition;

        if (from === to) return;

        // Calculate steps (handle wrapping)
        const steps: number[] = [];
        let current = from;
        while (current !== to) {
            current = (current + 1) % BOARD_SIZE;
            steps.push(current);
        }

        setIsMoving(true);

        // Animate through each step
        steps.forEach((tileIndex, i) => {
            setTimeout(() => {
                const isFinalStep = i === steps.length - 1;

                // Play audio synced with visual step landing (only for human players)
                if (!isCPU) {
                    setTimeout(() => {
                        if (isFinalStep) {
                            soundManager.play('pay-rent');
                        } else if (tileIndex === 0) {
                            soundManager.play('go-sound');
                        } else {
                            soundManager.play('token-step');
                        }
                    }, 125);
                }

                setCurrentStepTile(tileIndex);
                setCurrentPosition(getWorldPosition(tileIndex));

                // Publish to game store so camera can follow (only for active player)
                if (isActivePlayer) {
                    setMovingTileIndex(tileIndex);
                }

                // Last step
                if (isFinalStep) {
                    setIsMoving(false);
                    // Clear moving tile index when done
                    if (isActivePlayer) {
                        setMovingTileIndex(null);
                    }
                }
            }, (i + 1) * TOKEN_STEP_DURATION * 1000);
        });

        previousPosition.current = to;
    }, [playerPosition, isActivePlayer, setMovingTileIndex]);

    return { currentPosition, isMoving, currentStepTile };
}

/** Get the world position for a tile, offset for token height */
function getWorldPosition(tileIndex: number): Vector3Tuple {
    const layout = TILE_LAYOUTS[tileIndex];
    if (!layout) return [0, TOKEN_Y_OFFSET, 0];
    return [layout.position[0], TOKEN_Y_OFFSET, layout.position[2]];
}
