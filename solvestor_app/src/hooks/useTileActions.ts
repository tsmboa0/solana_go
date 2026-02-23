// ============================================================
// Tile Actions Hook — Solvestor (SWS)
// ============================================================
// Determines what action a tile triggers when landed on.
// ============================================================

import { useCallback } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { useUIStore } from '@/stores/useUIStore';
import { TILES } from '@/config/tiles';
import { TAX_AMOUNT } from '@/config/game';
import type { TileAction } from '@/types/game';

export function useTileActions() {
    const ownedTiles = useGameStore((s) => s.ownedTiles);
    const buyTile = useGameStore((s) => s.buyTile);
    const payRent = useGameStore((s) => s.payRent);
    const getCurrentPlayer = useGameStore((s) => s.getCurrentPlayer);
    const setPhase = useGameStore((s) => s.setPhase);
    const closePopup = useUIStore((s) => s.closePopup);

    /** Determine what action a tile triggers */
    const getTileAction = useCallback(
        (tileId: number): TileAction => {
            const tile = TILES[tileId];
            if (!tile) return { type: 'none' };
            const currentPlayer = getCurrentPlayer();

            switch (tile.category) {
                case 'property':
                case 'utility': {
                    const owner = ownedTiles[tileId];
                    if (!owner) {
                        return { type: 'buy', tileId, price: tile.price! };
                    }
                    if (owner !== currentPlayer.id) {
                        return {
                            type: 'pay_rent',
                            tileId,
                            amount: tile.rent!,
                            ownerId: owner,
                        };
                    }
                    return { type: 'none' };
                }
                case 'event':
                    return { type: 'draw_event', tileId };
                case 'tax':
                    return { type: 'pay_tax', tileId, amount: TAX_AMOUNT };
                case 'corner':
                    return {
                        type: 'corner',
                        tileId,
                        cornerType:
                            tileId === 0
                                ? 'go'
                                : tileId === 10
                                    ? 'staking'
                                    : tileId === 20
                                        ? 'governance'
                                        : 'liquidation',
                    };
                default:
                    return { type: 'none' };
            }
        },
        [ownedTiles, getCurrentPlayer]
    );

    /** Execute a buy action */
    const executeBuy = useCallback(
        (tileId: number) => {
            const player = getCurrentPlayer();
            buyTile(player.id, tileId);
            closePopup();
            setPhase('turnEnd');
        },
        [getCurrentPlayer, buyTile, closePopup, setPhase]
    );

    /** Execute a rent payment */
    const executeRent = useCallback(
        (tileId: number) => {
            const player = getCurrentPlayer();
            const owner = ownedTiles[tileId];
            const tile = TILES[tileId];
            if (owner && tile.rent) {
                payRent(player.id, owner, tile.rent);
            }
            closePopup();
            setPhase('turnEnd');
        },
        [getCurrentPlayer, ownedTiles, payRent, closePopup, setPhase]
    );

    /** Skip action (decline buy, dismiss event, etc.) */
    const skipAction = useCallback(() => {
        closePopup();
        setPhase('turnEnd');
    }, [closePopup, setPhase]);

    return { getTileAction, executeBuy, executeRent, skipAction };
}
