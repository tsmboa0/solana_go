// ============================================================
// Board Layout Calculator — Solvestor (SWS)
// ============================================================
// Pure function: computes 3D world positions + rotations
// for all 40 tiles arranged in a Monopoly-style square.
// ============================================================

import type { TileLayout } from '@/types/game';
import {
    BOARD_SIZE,
    TILE_WIDTH,
    CORNER_TILE_SIZE,
} from '@/config/game';

/**
 * Compute the 3D position and rotation for each tile index.
 *
 * Board layout (tile indices, viewed from above):
 *
 *   20  21  22  23  24  25  26  27  28  29  30
 *   19                                      31
 *   18                                      32
 *   17                                      33
 *   16           (center)                   34
 *   15                                      35
 *   14                                      36
 *   13                                      37
 *   12                                      38
 *   11                                      39
 *   10   9   8   7   6   5   4   3   2   1   0
 *
 * Tile 0 (Send It / GO) is at bottom-right corner.
 * Movement is counter-clockwise: 0→1→...→39→0.
 */
export function computeBoardLayout(): TileLayout[] {
    const layouts: TileLayout[] = [];
    const cornerIndices = new Set([0, 10, 20, 30]);

    // Half extent from center to the edge of the board
    // The board spans from tiles on each side
    const regularTilesPerSide = 9; // Between two corners
    const boardHalf =
        CORNER_TILE_SIZE / 2 + regularTilesPerSide * TILE_WIDTH / 2;

    for (let i = 0; i < BOARD_SIZE; i++) {
        const isCorner = cornerIndices.has(i);
        let x = 0;
        let z = 0;
        let rotation = 0;

        if (i === 0) {
            // Bottom-right corner
            x = boardHalf;
            z = boardHalf;
            rotation = 0;
        } else if (i > 0 && i < 10) {
            // Bottom row — right to left
            const offset = CORNER_TILE_SIZE / 2 + TILE_WIDTH / 2 + (i - 1) * TILE_WIDTH;
            x = boardHalf - offset;
            z = boardHalf;
            rotation = 0;
        } else if (i === 10) {
            // Bottom-left corner
            x = -boardHalf;
            z = boardHalf;
            rotation = -Math.PI / 2;
        } else if (i > 10 && i < 20) {
            // Left column — bottom to top
            const offset = CORNER_TILE_SIZE / 2 + TILE_WIDTH / 2 + (i - 11) * TILE_WIDTH;
            x = -boardHalf;
            z = boardHalf - offset;
            rotation = -Math.PI / 2;
        } else if (i === 20) {
            // Top-left corner
            x = -boardHalf;
            z = -boardHalf;
            rotation = Math.PI;
        } else if (i > 20 && i < 30) {
            // Top row — left to right
            const offset = CORNER_TILE_SIZE / 2 + TILE_WIDTH / 2 + (i - 21) * TILE_WIDTH;
            x = -boardHalf + offset;
            z = -boardHalf;
            rotation = Math.PI;
        } else if (i === 30) {
            // Top-right corner
            x = boardHalf;
            z = -boardHalf;
            rotation = Math.PI / 2;
        } else if (i > 30 && i < 40) {
            // Right column — top to bottom
            const offset = CORNER_TILE_SIZE / 2 + TILE_WIDTH / 2 + (i - 31) * TILE_WIDTH;
            x = boardHalf;
            z = -boardHalf + offset;
            rotation = Math.PI / 2;
        }

        layouts.push({
            position: [x, 0, z],
            rotation,
            isCorner,
        });
    }

    return layouts;
}

/** Pre-computed tile layout — cached at module level */
export const TILE_LAYOUTS = computeBoardLayout();
