// ============================================================
// Mock Player Data — Solvestor (SWS)
// ============================================================

import type { Player } from '@/types/game';
import { STARTING_BALANCE } from '@/config/game';
import { PLAYER_COLORS } from '@/config/theme';

/** Default 2-player setup for V1 hot-seat mode */
export const INITIAL_PLAYERS: Player[] = [
    {
        id: 'player-1',
        name: 'YOU',
        color: PLAYER_COLORS[0],
        position: 0,
        balance: STARTING_BALANCE,
        ownedTiles: [],
        isActive: true,
    },
    {
        id: 'player-2',
        name: 'CPU Bot',
        color: PLAYER_COLORS[1],
        position: 0,
        balance: STARTING_BALANCE,
        ownedTiles: [],
        isActive: false,
    },
];
