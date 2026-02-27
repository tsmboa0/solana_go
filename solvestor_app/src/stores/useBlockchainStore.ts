// ============================================================
// Blockchain Store — Solvestor (SWS)
// ============================================================
// Manages all on-chain state: room creation, joining, leaving,
// active games list, and real-time account subscriptions.
// ============================================================

import { create } from 'zustand';
import { BN } from '@coral-xyz/anchor';
import {
    PublicKey,
    Transaction,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import type { AnchorWallet } from '@solana/wallet-adapter-react';
import {
    getProgram,
    getERProgram,
    getL1Connection,
    getERConnection,
    deriveGamePDA,
    derivePlayerPDA,
    deriveEscrowPDA,
    getValidatorRemainingAccounts,
    shortenPubkey,
    lamportsToSol,
} from '@/anchor/setup';

// ─── Types ───────────────────────────────────────────────────

/** On-chain game room for lobby display */
export interface OnChainGame {
    /** Game PDA address */
    gamePDA: PublicKey;
    /** Game ID (BN) */
    gameId: BN;
    /** Creator's public key */
    creator: PublicKey;
    /** Number of current players */
    playerCount: number;
    /** Maximum players allowed */
    maxPlayers: number;
    /** Stake amount in lamports */
    stakeAmount: number;
    /** Starting capital */
    startCapital: number;
    /** Whether the game has started */
    isStarted: boolean;
    /** Whether the game has ended */
    isEnded: boolean;
    /** Timestamp of creation */
    createdAt: number;
    /** Shortened creator address for display */
    creatorDisplay: string;
    /** Shortened game PDA for room code */
    roomCode: string;
}

/** Deserialized on-chain GameState */
export interface OnChainGameState {
    gameId: BN;
    creator: PublicKey;
    bump: number;
    roundDuration: BN;
    startCapital: BN;
    stakeAmount: BN;
    maxPlayers: number;
    players: PublicKey[];
    playerCount: number;
    propertyOwners: PublicKey[];
    propertyUpgradeLevels: number[];
    escrowPda: PublicKey;
    authority: PublicKey;
    isEnded: boolean;
    isStarted: boolean;
    goCount: number;
    winner: PublicKey | null;
    createdAt: BN;
}

/** Deserialized on-chain PlayerState */
export interface OnChainPlayerState {
    user: PublicKey;
    game: PublicKey;
    playerIndex: number;
    balance: BN;
    currentPosition: number;
    lastRollTimestamp: BN;
    lastDiceResult: number[];
    goPasses: number;
    isActive: boolean;
    hasShield: boolean;
    hasStakedDefi: boolean;
    hasPotion: boolean;
    isInGraveyard: boolean;
    authority: PublicKey;
    bump: number;
}

// ─── Transaction Step Tracking ───────────────────────────────

export type TransactionStep = {
    label: string;
    status: 'pending' | 'signing' | 'confirming' | 'done' | 'error';
};

// ─── Store Interface ─────────────────────────────────────────

interface BlockchainState {
    // --- Lobby State ---
    activeGames: OnChainGame[];
    isFetchingGames: boolean;

    // --- Current Game State ---
    currentGamePDA: PublicKey | null;
    currentGameId: BN | null;
    currentGameState: OnChainGameState | null;
    currentPlayerState: OnChainPlayerState | null;
    currentPlayerPDA: PublicKey | null;

    // --- Transaction State ---
    isCreating: boolean;
    isJoining: boolean;
    isLeaving: boolean;
    txSteps: TransactionStep[];
    error: string | null;

    // --- Subscription IDs ---
    _gameSubId: number | null;
    _playerSubId: number | null;

    // --- Actions ---
    fetchActiveGames: (wallet: AnchorWallet) => Promise<void>;
    createRoom: (
        wallet: AnchorWallet,
        config: {
            maxPlayers: number;
            roundDuration: number;
            startCapital: number;
            stakeAmount: number;
        }
    ) => Promise<{ gamePDA: PublicKey; gameId: BN } | null>;
    joinRoom: (
        wallet: AnchorWallet,
        gamePDA: PublicKey,
        gameState: OnChainGame
    ) => Promise<boolean>;
    leaveRoom: (wallet: AnchorWallet) => Promise<boolean>;
    subscribeToGame: (wallet: AnchorWallet, gamePDA: PublicKey) => void;
    subscribeToPlayer: (wallet: AnchorWallet, gamePDA: PublicKey, userPubkey: PublicKey) => void;
    unsubscribeAll: () => void;
    clearError: () => void;
    clearCurrentGame: () => void;
    setCurrentGame: (gamePDA: PublicKey, gameId: BN) => void;
}

// ─── Store Implementation ────────────────────────────────────

export const useBlockchainStore = create<BlockchainState>()((set, get) => ({
    // Initial state
    activeGames: [],
    isFetchingGames: false,
    currentGamePDA: null,
    currentGameId: null,
    currentGameState: null,
    currentPlayerState: null,
    currentPlayerPDA: null,
    isCreating: false,
    isJoining: false,
    isLeaving: false,
    txSteps: [],
    error: null,
    _gameSubId: null,
    _playerSubId: null,

    // ─── Fetch Active Games ─────────────────────────────────

    fetchActiveGames: async (wallet: AnchorWallet) => {
        set({ isFetchingGames: true });
        try {
            const connection = getL1Connection();
            const program = getProgram(connection, wallet);

            const erProgram = getERProgram(wallet);

            //All games account. L1 + Delegated
            const allGames: any[] = [];

            // Fetch all GameState accounts on l1
            const L1Games = await (program.account as any).gameState.all();
            allGames.push(...L1Games);

            //Fetch all Delegated Games on MagicBlock
            const erGames = await (erProgram.account as any).gameState.all();
            allGames.push(...erGames);

            // Deduplicate games by game PDA (publicKey)
            // If a game exists on both, we just keep one instance to show in the lobby.
            const uniqueGamesMap = new Map<string, any>();
            for (const account of allGames) {
                const pubkeyStr = account.publicKey.toBase58();
                if (!uniqueGamesMap.has(pubkeyStr)) {
                    uniqueGamesMap.set(pubkeyStr, account);
                }
            }
            const uniqueGames = Array.from(uniqueGamesMap.values());

            const games: OnChainGame[] = uniqueGames
                .map((account: any) => {
                    const data = account.account;
                    return {
                        gamePDA: account.publicKey,
                        gameId: data.gameId,
                        creator: data.creator,
                        playerCount: data.playerCount,
                        maxPlayers: data.maxPlayers,
                        stakeAmount: typeof data.stakeAmount.toNumber === 'function'
                            ? data.stakeAmount.toNumber()
                            : Number(data.stakeAmount),
                        startCapital: typeof data.startCapital.toNumber === 'function'
                            ? data.startCapital.toNumber()
                            : Number(data.startCapital),
                        isStarted: data.isStarted,
                        isEnded: data.isEnded,
                        createdAt: typeof data.createdAt.toNumber === 'function'
                            ? data.createdAt.toNumber()
                            : Number(data.createdAt),
                        creatorDisplay: shortenPubkey(data.creator),
                        roomCode: shortenPubkey(account.publicKey, 4),
                    } as OnChainGame;
                })
                // Show: not ended, not started (waiting for players), and has room
                .filter((g: OnChainGame) => !g.isEnded)
                // Sort by most recent first
                .sort((a: OnChainGame, b: OnChainGame) => b.createdAt - a.createdAt);

            set({ activeGames: games, isFetchingGames: false });
        } catch (err: any) {
            console.error('Failed to fetch active games:', err);
            set({ isFetchingGames: false, error: `Failed to fetch games: ${err.message}` });
        }
    },

    // ─── Create Room ────────────────────────────────────────

    createRoom: async (wallet, config) => {
        set({
            isCreating: true,
            error: null,
            txSteps: [
                { label: 'Creating room & joining as Player 1', status: 'pending' },
                { label: 'Delegating game to Ephemeral Rollup', status: 'pending' },
            ],
        });

        try {
            const connection = getL1Connection();
            const program = getProgram(connection, wallet);
            const gameId = new BN(Date.now());

            // Derive PDAs
            const [gamePDA] = deriveGamePDA(wallet.publicKey, gameId);
            const [playerPDA] = derivePlayerPDA(gamePDA, wallet.publicKey);
            const [escrowPDA] = deriveEscrowPDA(gamePDA);

            console.log('Creating room with PDAs:', {
                gamePDA: gamePDA.toBase58(),
                playerPDA: playerPDA.toBase58(),
                escrowPDA: escrowPDA.toBase58(),
                gameId: gameId.toString(),
            });

            // ── Step 1: create_room (inits game + player + escrow stake) ──
            set({ txSteps: updateStep(get().txSteps, 0, 'signing') });

            const createTx = await program.methods
                .createRoom(
                    gameId,
                    new BN(config.roundDuration),
                    new BN(config.startCapital),
                    new BN(config.stakeAmount),
                    config.maxPlayers
                )
                .accounts({
                    creator: wallet.publicKey,
                })
                .rpc({ skipPreflight: true });

            console.log('create_room tx:', createTx);
            set({ txSteps: updateStep(get().txSteps, 0, 'done') });

            // ── Step 2: delegate_game + delegate_player (bundled) ──
            set({ txSteps: updateStep(get().txSteps, 1, 'signing') });

            const delegatePlayerIx = await program.methods
                .delegatePlayer()
                .accountsPartial({
                    payer: wallet.publicKey,
                    player: playerPDA,
                })
                .remainingAccounts(getValidatorRemainingAccounts())
                .rpc({ skipPreflight: true });

            console.log('delegate_player tx:', delegatePlayerIx);
            set({ txSteps: updateStep(get().txSteps, 1, 'done') });

            // Set current game state
            set({
                isCreating: false,
                currentGamePDA: gamePDA,
                currentGameId: gameId,
                currentPlayerPDA: playerPDA,
            });

            return { gamePDA, gameId };
        } catch (err: any) {
            console.error('Create room failed:', err);
            const steps = get().txSteps;
            const failIdx = steps.findIndex(s => s.status === 'signing' || s.status === 'confirming');
            if (failIdx >= 0) {
                set({ txSteps: updateStep(steps, failIdx, 'error') });
            }
            set({ isCreating: false, error: `Create room failed: ${err.message}` });
            return null;
        }
    },

    // ─── Join Room ──────────────────────────────────────────

    joinRoom: async (wallet, gamePDA, gameState) => {
        set({
            isJoining: true,
            error: null,
            txSteps: [
                { label: 'Joining room & staking SOL', status: 'pending' },
                { label: 'Delegating player to Ephemeral Rollup', status: 'pending' },
            ],
        });

        try {
            const connection = getL1Connection();
            const program = getProgram(connection, wallet);

            // Derive PDAs
            const [playerPDA] = derivePlayerPDA(gamePDA, wallet.publicKey);
            const [escrowPDA] = deriveEscrowPDA(gamePDA);

            console.log('Joining room:', {
                gamePDA: gamePDA.toBase58(),
                playerPDA: playerPDA.toBase58(),
                escrowPDA: escrowPDA.toBase58(),
            });

            // ── Step 1: join_room ──
            set({ txSteps: updateStep(get().txSteps, 0, 'signing') });

            const gameData = await (program.account as any).gameState.fetch(gamePDA);
            const isLastPlayer = gameData.maxPlayers - gameData.playerCount === 1 ? true : false;

            const joinTx = await program.methods
                .joinRoom()
                .accounts({
                    user: wallet.publicKey,
                    game: gamePDA,
                    escrow: escrowPDA,
                })
                .rpc({ skipPreflight: true });

            console.log('join_room tx:', joinTx);
            set({ txSteps: updateStep(get().txSteps, 0, 'done') });

            // ── Step 2: delegate_player ──
            set({ txSteps: updateStep(get().txSteps, 1, 'signing') });

            if (isLastPlayer) {
                // Delegate player and game
                const delegateGameIx = await program.methods
                    .delegateGame(gameData.gameId)
                    .accountsPartial({
                        payer: wallet.publicKey,
                        game: gamePDA,
                    })
                    .remainingAccounts(getValidatorRemainingAccounts())
                    .instruction();

                const delegatePlayerIx = await program.methods
                    .delegatePlayer()
                    .accountsPartial({
                        payer: wallet.publicKey,
                        player: playerPDA,
                    })
                    .remainingAccounts(getValidatorRemainingAccounts())
                    .instruction();

                // Bundle both delegation instructions into one transaction
                const delegateTx = new Transaction().add(delegateGameIx, delegatePlayerIx);
                delegateTx.feePayer = wallet.publicKey;
                delegateTx.recentBlockhash = (
                    await connection.getLatestBlockhash()
                ).blockhash;

                const signedDelegateTx = await wallet.signTransaction(delegateTx);
                const delegateTxHash = await connection.sendRawTransaction(
                    signedDelegateTx.serialize(),
                    { skipPreflight: true }
                );
                await connection.confirmTransaction(delegateTxHash, 'confirmed');

                set({ txSteps: updateStep(get().txSteps, 1, 'done') });

                // Set current game state
                set({
                    isJoining: false,
                    currentGamePDA: gamePDA,
                    currentGameId: gameState.gameId,
                    currentPlayerPDA: playerPDA,
                });

                return true
            }

            const delegatePlayerIx = await program.methods
                .delegatePlayer()
                .accountsPartial({
                    payer: wallet.publicKey,
                    player: playerPDA,
                })
                .remainingAccounts(getValidatorRemainingAccounts())
                .rpc({ skipPreflight: true });

            console.log('delegate_player tx:', delegatePlayerIx);
            set({ txSteps: updateStep(get().txSteps, 1, 'done') });

            // Set current game state
            set({
                isJoining: false,
                currentGamePDA: gamePDA,
                currentGameId: gameState.gameId,
                currentPlayerPDA: playerPDA,
            });

            return true;
        } catch (err: any) {
            console.error('Join room failed:', err);
            const steps = get().txSteps;
            const failIdx = steps.findIndex(s => s.status === 'signing' || s.status === 'confirming');
            if (failIdx >= 0) {
                set({ txSteps: updateStep(steps, failIdx, 'error') });
            }
            set({ isJoining: false, error: `Join room failed: ${err.message}` });
            return false;
        }
    },

    // ─── Leave Room ─────────────────────────────────────────

    leaveRoom: async (wallet) => {
        const { currentGamePDA } = get();
        if (!currentGamePDA) return false;

        set({ isLeaving: true, error: null });

        try {
            const program = getProgram(getL1Connection(), wallet);
            const [playerPDA] = derivePlayerPDA(currentGamePDA, wallet.publicKey);

            // leave_room runs on ER (commit + undelegate)
            // Build tx with L1 program, send via ER connection
            const tx = await program.methods
                .leaveRoom()
                .accountsPartial({
                    user: wallet.publicKey,
                    game: currentGamePDA,
                    player: playerPDA,
                })
                .transaction();

            const erConnection = getERConnection();
            tx.feePayer = wallet.publicKey;
            tx.recentBlockhash = (await erConnection.getLatestBlockhash()).blockhash;

            const signedTx = await wallet.signTransaction(tx);
            const txHash = await erConnection.sendRawTransaction(signedTx.serialize(), {
                skipPreflight: true,
            });
            await erConnection.confirmTransaction(txHash, 'confirmed');

            console.log('leave_room tx:', txHash);

            // Clean up
            get().unsubscribeAll();
            set({
                isLeaving: false,
                currentGamePDA: null,
                currentGameId: null,
                currentGameState: null,
                currentPlayerState: null,
                currentPlayerPDA: null,
            });

            return true;
        } catch (err: any) {
            console.error('Leave room failed:', err);
            set({ isLeaving: false, error: `Leave room failed: ${err.message}` });
            return false;
        }
    },

    // ─── Subscriptions ──────────────────────────────────────

    subscribeToGame: (wallet, gamePDA) => {
        const erConnection = getERConnection();
        const program = getProgram(getL1Connection(), wallet);

        // Unsubscribe previous if exists
        const prevId = get()._gameSubId;
        if (prevId !== null) {
            erConnection.removeAccountChangeListener(prevId);
        }

        const subId = erConnection.onAccountChange(
            gamePDA,
            (accountInfo) => {
                try {
                    const decoded = (program.coder.accounts as any).decode(
                        'gameState',
                        accountInfo.data
                    );
                    set({ currentGameState: decoded as OnChainGameState });
                } catch (err) {
                    console.error('Failed to decode GameState:', err);
                }
            },
            'confirmed'
        );

        set({ _gameSubId: subId });

        // Also do an initial fetch
        (async () => {
            try {
                const erProgram = getERProgram(wallet);
                const gameState = await (erProgram.account as any).gameState.fetch(gamePDA);
                set({ currentGameState: gameState as OnChainGameState });
            } catch (err) {
                // Try L1 if not yet on ER
                try {
                    const gameState = await (program.account as any).gameState.fetch(gamePDA);
                    set({ currentGameState: gameState as OnChainGameState });
                } catch {
                    console.error('Failed to fetch initial game state:', err);
                }
            }
        })();
    },

    subscribeToPlayer: (wallet, gamePDA, userPubkey) => {
        const erConnection = getERConnection();
        const program = getProgram(getL1Connection(), wallet);
        const [playerPDA] = derivePlayerPDA(gamePDA, userPubkey);

        // Unsubscribe previous if exists
        const prevId = get()._playerSubId;
        if (prevId !== null) {
            erConnection.removeAccountChangeListener(prevId);
        }

        const subId = erConnection.onAccountChange(
            playerPDA,
            (accountInfo) => {
                try {
                    const decoded = (program.coder.accounts as any).decode(
                        'playerState',
                        accountInfo.data
                    );
                    set({ currentPlayerState: decoded as OnChainPlayerState });
                } catch (err) {
                    console.error('Failed to decode PlayerState:', err);
                }
            },
            'confirmed'
        );

        set({ _playerSubId: subId, currentPlayerPDA: playerPDA });

        // Initial fetch
        (async () => {
            try {
                const erProgram = getERProgram(wallet);
                const playerState = await (erProgram.account as any).playerState.fetch(playerPDA);
                set({ currentPlayerState: playerState as OnChainPlayerState });
            } catch (err) {
                try {
                    const playerState = await (program.account as any).playerState.fetch(playerPDA);
                    set({ currentPlayerState: playerState as OnChainPlayerState });
                } catch {
                    console.error('Failed to fetch initial player state:', err);
                }
            }
        })();
    },

    unsubscribeAll: () => {
        const { _gameSubId, _playerSubId } = get();
        const erConnection = getERConnection();

        if (_gameSubId !== null) {
            erConnection.removeAccountChangeListener(_gameSubId);
        }
        if (_playerSubId !== null) {
            erConnection.removeAccountChangeListener(_playerSubId);
        }

        set({ _gameSubId: null, _playerSubId: null });
    },

    // ─── Utility ─────────────────────────────────────────────

    clearError: () => set({ error: null }),

    clearCurrentGame: () => {
        get().unsubscribeAll();
        set({
            currentGamePDA: null,
            currentGameId: null,
            currentGameState: null,
            currentPlayerState: null,
            currentPlayerPDA: null,
            txSteps: [],
        });
    },

    setCurrentGame: (gamePDA, gameId) => {
        set({ currentGamePDA: gamePDA, currentGameId: gameId });
    },
}));

// ─── Helpers ─────────────────────────────────────────────────

/** Immutably update a step's status in the txSteps array */
function updateStep(steps: TransactionStep[], index: number, status: TransactionStep['status']): TransactionStep[] {
    return steps.map((s, i) => (i === index ? { ...s, status } : s));
}

// ─── Selectors ───────────────────────────────────────────────

export const selectActiveGames = (state: BlockchainState) => state.activeGames;
export const selectIsCreating = (state: BlockchainState) => state.isCreating;
export const selectIsJoining = (state: BlockchainState) => state.isJoining;
export const selectCurrentGameState = (state: BlockchainState) => state.currentGameState;
export const selectCurrentPlayerState = (state: BlockchainState) => state.currentPlayerState;
export const selectTxSteps = (state: BlockchainState) => state.txSteps;
export const selectError = (state: BlockchainState) => state.error;
