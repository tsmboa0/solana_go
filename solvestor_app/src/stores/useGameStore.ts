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
import { TILES } from '@/config/boardTiles';
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
    /** Whether the game is in explore mode (solo vs CPU) */
    isExploreMode: boolean;

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
    /** Set up explore mode: mark player 2 as CPU */
    setupExploreMode: () => void;
    /** Cooldown: timestamp of last roll for the human player */
    lastRollTime: number | null;
    /** Cooldown duration in ms */
    cooldownDuration: number;
    /** Start cooldown timer */
    startCooldown: () => void;
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
        lastRollTime: null,
        cooldownDuration: 10000, // 10 seconds
        isExploreMode: false,

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
                if (!player || !tile) return;

                const fn = tile.tile_function;
                if (!tile.is_ownable || fn.action_type !== 'ownable' || fn.buy_price === undefined) return;

                if (player.balance < fn.buy_price) return;
                if (state.ownedTiles[tileId]) return;

                player.balance -= fn.buy_price;
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
                // In explore mode, DON'T switch players — human stays active,
                // CPU operates independently on its own timer.
                if (state.isExploreMode) {
                    // Just reset phase for the human player
                    state.phase = 'waiting';
                    state.lastDiceResult = null;
                    state.turnNumber += 1;
                } else {
                    // Normal turn-based: switch to next player
                    state.players[state.currentPlayerIndex].isActive = false;
                    state.currentPlayerIndex =
                        (state.currentPlayerIndex + 1) % state.players.length;
                    state.players[state.currentPlayerIndex].isActive = true;
                    state.phase = 'waiting';
                    state.lastDiceResult = null;
                    state.turnNumber += 1;
                }
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
                state.isExploreMode = false;
            });
        },

        setupExploreMode: () => {
            set((state) => {
                state.players = structuredClone(INITIAL_PLAYERS);
                // Mark player 2 as CPU
                if (state.players.length >= 2) {
                    state.players[1].isCPU = true;
                    state.players[1].name = 'CPU Bot';
                }
                state.currentPlayerIndex = 0;
                state.phase = 'waiting';
                state.lastDiceResult = null;
                state.ownedTiles = {};
                state.turnNumber = 1;
                state.lastRollTime = null;
                state.isExploreMode = true;
            });
        },

        startCooldown: () => {
            set({ lastRollTime: Date.now() });
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
