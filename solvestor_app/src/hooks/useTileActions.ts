// ============================================================
// Tile Actions Hook — Solvestor (SWS)
// ============================================================
// Determines what action a tile triggers when landed on.
// ============================================================

import { useCallback } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { useUIStore } from '@/stores/useUIStore';
import { TILES } from '@/config/boardTiles';
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

            const fn = tile.tile_function;
            switch (fn.action_type) {
                case 'ownable': {
                    const owner = ownedTiles[tileId];
                    if (!owner) {
                        return { type: 'buy', tileId, price: fn.buy_price };
                    }
                    if (owner !== currentPlayer.id) {
                        return {
                            type: 'pay_rent',
                            tileId,
                            amount: fn.rent_value,
                            ownerId: owner,
                        };
                    }
                    return { type: 'none' };
                }
                case 'event':
                    return { type: 'draw_event', tileId };
                case 'risk':
                    return { type: 'pay_tax', tileId, amount: fn.penalty_value < 1 ? Math.floor(currentPlayer.balance * fn.penalty_value) : fn.penalty_value };
                case 'defi':
                    return { type: 'pay_tax', tileId, amount: fn.landing_fee };
                case 'privacy':
                    return { type: 'buy', tileId, price: fn.shield_cost }; // Treat as buy for now
                case 'neutral':
                    return { type: 'none' };
                case 'governance':
                    return { type: 'corner', tileId, cornerType: 'governance' };
                case 'corner':
                    return {
                        type: 'corner',
                        tileId,
                        cornerType: fn.corner_type as any
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
            if (owner && tile.tile_function.action_type === 'ownable') {
                payRent(player.id, owner, tile.tile_function.rent_value);
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
