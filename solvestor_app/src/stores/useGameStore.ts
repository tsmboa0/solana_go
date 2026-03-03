// ============================================================
// Game Store — Solvestor (SWS)
// ============================================================
// Core game state: players, turns, ownership, economy.
// Uses persist middleware to survive browser refresh.
// Pure logic — no rendering concerns.
// ============================================================

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import type { Player, GamePhase, DiceResult } from '@/types/game';
import { INITIAL_PLAYERS } from '@/config/players';
import { TILES } from '@/config/boardTiles';
import { BOARD_SIZE, GO_SALARY, TAX_AMOUNT } from '@/config/game';
import { PLAYER_COLORS } from '@/config/theme';
import { shortenPubkey } from '@/anchor/setup';

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
    /** Whether the game is in beginner mode (async multiplayer) */
    isBeginnerMode: boolean;
    /** Index of the local (wallet-connected) player in the players array */
    localPlayerIndex: number;

    // --- Actions ---
    rollDice: () => DiceResult;
    setPhase: (phase: GamePhase) => void;
    movePlayer: (playerId: string, steps: number) => void;
    buyTile: (playerId: string, tileId: number) => void;
    payRent: (payerId: string, ownerId: string, amount: number) => void;
    endTurn: () => void;
    getCurrentPlayer: () => Player;
    getLocalPlayer: () => Player;
    /** Check if a player is remote (not the local player) */
    isRemotePlayer: (playerId: string) => boolean;
    setMovingTileIndex: (tileIndex: number | null) => void;
    resetGame: () => void;
    /** Set up explore mode: mark player 2 as CPU */
    setupExploreMode: () => void;
    /** Set up beginner mode: map on-chain players to local state */
    setupBeginnerMode: (localIndex: number, onChainPlayers: { pubkey: string; balance: number; position: number }[]) => void;
    /** Update a player's state from on-chain data or local logic */
    updatePlayerFromChain: (playerId: string, data: {
        balance?: number;
        position?: number;
        hasShield?: boolean;
        hasStakedDefi?: boolean;
        hasPotion?: boolean;
        isInGraveyard?: boolean;
    }) => void;
    /** Update property ownership from on-chain data */
    updateOwnershipFromChain: (propertyOwners: string[]) => void;
    /** Cooldown: timestamp of last roll for the human player */
    lastRollTime: number | null;
    /** Cooldown duration in ms */
    cooldownDuration: number;
    /** Start cooldown timer */
    startCooldown: () => void;
    /** Leave the current game: clears persisted state */
    leaveGame: () => void;
    /** Direct position set for rush teleport (no step animation) */
    setPlayerPosition: (playerId: string, position: number) => void;
}

const INITIAL_STATE = {
    players: structuredClone(INITIAL_PLAYERS),
    currentPlayerIndex: 0,
    phase: 'waiting' as GamePhase,
    lastDiceResult: null as DiceResult | null,
    ownedTiles: {} as Record<number, string>,
    turnNumber: 1,
    movingTileIndex: null as number | null,
    lastRollTime: null as number | null,
    cooldownDuration: 10000,
    isExploreMode: false,
    isBeginnerMode: false,
    localPlayerIndex: 0,
};



export const useGameStore = create<GameState>()(
    persist(
        immer((set, get) => ({
            ...structuredClone(INITIAL_STATE),

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

                    // Check if player passed GO (only add salary in explore mode —
                    // in beginner mode, balance comes from on-chain)
                    if (newPosition < oldPosition && !state.isBeginnerMode) {
                        player.balance += GO_SALARY;
                    }

                    player.position = newPosition;

                    // Only set phase to 'moving' for the LOCAL player's roll.
                    // CPU players and remote players don't change phase.
                    const isCPUPlayer = player.isCPU === true;
                    const isRemote = state.isBeginnerMode && player.id !== state.players[state.localPlayerIndex]?.id;
                    if (!isCPUPlayer && !isRemote) {
                        state.phase = 'moving';
                    }
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
                    // In explore/beginner mode, DON'T switch players — local player stays active.
                    // Remote players move independently via on-chain state sync.
                    if (state.isExploreMode || state.isBeginnerMode) {
                        // Just reset phase for the local player
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

            getLocalPlayer: () => {
                const state = get();
                if (state.isBeginnerMode) {
                    return state.players[state.localPlayerIndex];
                }
                return state.players[state.currentPlayerIndex];
            },

            isRemotePlayer: (playerId: string) => {
                const state = get();
                if (!state.isBeginnerMode) return false;
                const localPlayer = state.players[state.localPlayerIndex];
                return localPlayer ? localPlayer.id !== playerId : false;
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
                    state.isBeginnerMode = false;
                    state.localPlayerIndex = 0;
                });
            },

            setupExploreMode: () => {
                set((state) => {
                    // Always ensure beginner mode is off
                    state.isBeginnerMode = false;

                    // Only reset if not already in explore mode (preserve state on refresh)
                    if (state.isExploreMode) {
                        // Already set up — just reset transient state
                        state.phase = 'waiting';
                        state.lastDiceResult = null;
                        state.movingTileIndex = null;
                        return;
                    }

                    state.players = structuredClone(INITIAL_PLAYERS);
                    // Mark player 1 as YOU and player 2 as CPU
                    if (state.players.length >= 1) {
                        state.players[0].name = 'YOU';
                    }
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

            // ─── Beginner Mode Setup (Async Multiplayer) ────────

            setupBeginnerMode: (localIndex, onChainPlayers) => {
                set((state) => {
                    // Always force-replace players with fresh on-chain data.
                    // (Don't guard on player count — persisted stale data from
                    // explore mode could cause mismatched tokens.)
                    const players: Player[] = onChainPlayers.map((p, i) => ({
                        id: p.pubkey,
                        name: i === localIndex ? 'You' : shortenPubkey(p.pubkey),
                        color: PLAYER_COLORS[i] || '#888888',
                        position: p.position,
                        balance: p.balance,
                        ownedTiles: [],
                        isActive: i === localIndex, // Only local player is "active"
                        isCPU: false,
                    }));

                    state.players = players;
                    state.currentPlayerIndex = localIndex; // Camera follows local
                    state.localPlayerIndex = localIndex;
                    state.phase = 'waiting';
                    state.lastDiceResult = null;
                    state.ownedTiles = {};
                    state.turnNumber = 1;
                    state.lastRollTime = null;
                    state.isExploreMode = false;
                    state.isBeginnerMode = true;
                    state.movingTileIndex = null;
                });
            },

            updatePlayerFromChain: (playerId, data) => {
                set((state) => {
                    const player = state.players.find((p) => p.id === playerId);
                    if (!player) return;
                    if (data.balance !== undefined) player.balance = data.balance;
                    if (data.position !== undefined) player.position = data.position;
                    if (data.hasShield !== undefined) player.hasShield = data.hasShield;
                    if (data.hasStakedDefi !== undefined) player.hasStakedDefi = data.hasStakedDefi;
                    if (data.hasPotion !== undefined) player.hasPotion = data.hasPotion;
                    if (data.isInGraveyard !== undefined) player.isInGraveyard = data.isInGraveyard;
                });
            },

            updateOwnershipFromChain: (propertyOwners) => {
                set((state) => {
                    const newOwned: Record<number, string> = {};
                    const defaultPubkey = '11111111111111111111111111111111';
                    for (let i = 0; i < propertyOwners.length; i++) {
                        if (propertyOwners[i] && propertyOwners[i] !== defaultPubkey) {
                            newOwned[i] = propertyOwners[i];
                        }
                    }
                    state.ownedTiles = newOwned;

                    // Also update each player's ownedTiles array
                    for (const player of state.players) {
                        player.ownedTiles = Object.entries(newOwned)
                            .filter(([, ownerId]) => ownerId === player.id)
                            .map(([tileId]) => Number(tileId));
                    }
                });
            },

            leaveGame: () => {
                set((state) => {
                    // Reset everything to initial
                    Object.assign(state, structuredClone(INITIAL_STATE));
                });
                // Clear the persisted storage
                useGameStore.persist.clearStorage();
            },

            setPlayerPosition: (playerId, position) => {
                set((state) => {
                    const player = state.players.find((p) => p.id === playerId);
                    if (player) player.position = position;
                });
            },
        })),
        {
            name: 'solvestor-game-state',
            // Only persist the meaningful game state, not transient UI state
            partialize: (state) => ({
                // Only persist game progress, NOT mode flags or player lists.
                // Mode (beginner/explore) is determined fresh from URL on each load.
                // Players are set by setupBeginnerMode/setupExploreMode from on-chain data.
                ownedTiles: state.ownedTiles,
                turnNumber: state.turnNumber,
                cooldownDuration: state.cooldownDuration,
                // Don't persist: players, isBeginnerMode, isExploreMode, localPlayerIndex,
                // phase, lastDiceResult, movingTileIndex, lastRollTime, currentPlayerIndex
            }),
        }
    )
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
