// ============================================================
// Game Store — Solvestor (SWS)
// ============================================================
// Core game state: players, turns, ownership, economy.
// Pure logic — no rendering concerns.
// ============================================================

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Player, GamePhase, DiceResult } from '@/types/game';
import { INITIAL_PLAYERS } from '@/config/players';
import { TILES } from '@/config/tiles';
import { BOARD_SIZE, GO_SALARY, TAX_AMOUNT } from '@/config/game';

interface GameState {
    // --- State ---
    players: Player[];
    currentPlayerIndex: number;
    phase: GamePhase;
    lastDiceResult: DiceResult | null;
    /** tileId → playerId ownership map */
    ownedTiles: Record<number, string>;
    /** Current tile index the token is visiting during movement animation */
    movingTileIndex: number | null;
    /** Turn counter */
    turnNumber: number;

    // --- Actions ---
    rollDice: () => DiceResult;
    setPhase: (phase: GamePhase) => void;
    movePlayer: (playerId: string, steps: number) => void;
    buyTile: (playerId: string, tileId: number) => void;
    payRent: (payerId: string, ownerId: string, amount: number) => void;
    endTurn: () => void;
    getCurrentPlayer: () => Player;
    setMovingTileIndex: (tileIndex: number | null) => void;
    resetGame: () => void;
}

export const useGameStore = create<GameState>()(
    immer((set, get) => ({
        players: structuredClone(INITIAL_PLAYERS),
        currentPlayerIndex: 0,
        phase: 'waiting' as GamePhase,
        lastDiceResult: null,
        ownedTiles: {},
        turnNumber: 1,
        movingTileIndex: null,

        rollDice: () => {
            const die1 = Math.floor(Math.random() * 6) + 1;
            const die2 = Math.floor(Math.random() * 6) + 1;
            const result: DiceResult = {
                die1,
                die2,
                total: die1 + die2,
                isDoubles: die1 === die2,
            };
            set((state) => {
                state.lastDiceResult = result;
                state.phase = 'rolling';
            });
            return result;
        },

        setPhase: (phase: GamePhase) => {
            set((state) => {
                state.phase = phase;
            });
        },

        movePlayer: (playerId: string, steps: number) => {
            set((state) => {
                const player = state.players.find((p) => p.id === playerId);
                if (!player) return;

                const oldPosition = player.position;
                const newPosition = (oldPosition + steps) % BOARD_SIZE;

                // Check if player passed GO
                if (newPosition < oldPosition) {
                    player.balance += GO_SALARY;
                }

                player.position = newPosition;
                state.phase = 'moving';
            });
        },

        buyTile: (playerId: string, tileId: number) => {
            set((state) => {
                const player = state.players.find((p) => p.id === playerId);
                const tile = TILES[tileId];
                if (!player || !tile || tile.price === null) return;
                if (player.balance < tile.price) return;
                if (state.ownedTiles[tileId]) return;

                player.balance -= tile.price;
                player.ownedTiles.push(tileId);
                state.ownedTiles[tileId] = playerId;
            });
        },

        payRent: (payerId: string, ownerId: string, amount: number) => {
            set((state) => {
                const payer = state.players.find((p) => p.id === payerId);
                const owner = state.players.find((p) => p.id === ownerId);
                if (!payer || !owner) return;

                payer.balance -= amount;
                owner.balance += amount;
            });
        },

        endTurn: () => {
            set((state) => {
                // Deactivate current player
                state.players[state.currentPlayerIndex].isActive = false;

                // Move to next player
                state.currentPlayerIndex =
                    (state.currentPlayerIndex + 1) % state.players.length;

                // Activate new player
                state.players[state.currentPlayerIndex].isActive = true;

                state.phase = 'waiting';
                state.lastDiceResult = null;
                state.turnNumber += 1;
            });
        },

        getCurrentPlayer: () => {
            const state = get();
            return state.players[state.currentPlayerIndex];
        },

        setMovingTileIndex: (tileIndex: number | null) => {
            set((state) => {
                state.movingTileIndex = tileIndex;
            });
        },

        resetGame: () => {
            set((state) => {
                state.players = structuredClone(INITIAL_PLAYERS);
                state.currentPlayerIndex = 0;
                state.phase = 'waiting';
                state.lastDiceResult = null;
                state.ownedTiles = {};
                state.turnNumber = 1;
            });
        },
    }))
);

// ============================================================
// Selectors (for optimized re-renders)
// ============================================================

export const selectCurrentPlayer = (state: GameState) =>
    state.players[state.currentPlayerIndex];

export const selectPhase = (state: GameState) => state.phase;

export const selectPlayers = (state: GameState) => state.players;

/** Get tax amount — exported so tile actions can reference it */
export { TAX_AMOUNT };
