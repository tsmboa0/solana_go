// ============================================================
// Tile Group — Solvestor (SWS)
// ============================================================
// Lays out all 40 tiles in the Monopoly square formation.
// ============================================================

import { TILES } from '@/config/boardTiles';
import { TILE_LAYOUTS } from '@/utils/boardLayout';
import { Tile } from './Tile';

export function TileGroup() {
    return (
        <group>
            {TILES.map((tile, index) => (
                <Tile
                    key={tile.tile_index}
                    tile={tile}
                    layout={TILE_LAYOUTS[index]}
                />
            ))}
        </group>
    );
}
