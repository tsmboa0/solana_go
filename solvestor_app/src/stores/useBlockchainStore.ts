// ============================================================
// Blockchain Store — Solvestor (SWS)
// ============================================================
// Manages all on-chain state: room creation, joining, leaving,
// subscriptions. Pure Zustand store — no React hooks.
// ============================================================

import { create } from 'zustand';
import { BN } from '@coral-xyz/anchor';
import {
    PublicKey,
    Transaction,
    Keypair,
} from '@solana/web3.js';
import type { TransactionInstruction } from '@solana/web3.js';
import type { AnchorWallet } from '@solana/wallet-adapter-react';
import {
    getL1Connection,
    getERConnection,
    getProgram,
    getERProgram,
    deriveGamePDA,
    derivePlayerPDA,
    deriveEscrowPDA,
    getValidatorRemainingAccounts,
    shortenPubkey,
    PROGRAM_ID,
} from '@/anchor/setup';
import { useGameStore } from '@/stores/useGameStore';
import { deriveTempKeypair } from '@/hooks/useSessionKey';

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

// ─── Session Params (for bundling session creation) ──────────

export interface SessionParams {
    instructions: TransactionInstruction[];
    tempKeypair: Keypair;
}

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
    /** Where the last playerState update came from */
    playerStateSource: 'subscription' | 'initial_fetch' | 'manual_fetch' | null;
    currentPlayerPDA: PublicKey | null;

    // --- Remote Players (multiplayer sync) ---
    remotePlayerStates: Record<string, OnChainPlayerState>;

    // --- Transaction State ---
    isCreating: boolean;
    isJoining: boolean;
    isLeaving: boolean;
    txSteps: TransactionStep[];
    error: string | null;

    // --- Subscription IDs ---
    _gameSubId: number | null;
    _playerSubId: number | null;
    _remotePlayerSubIds: number[];

    // --- Actions ---
    fetchActiveGames: (wallet: AnchorWallet) => Promise<void>;
    createRoom: (
        wallet: AnchorWallet,
        config: {
            maxPlayers: number;
            roundDuration: number;
            startCapital: number;
            stakeAmount: number;
        },
        sessionParams?: SessionParams
    ) => Promise<{ gamePDA: PublicKey; gameId: BN } | null>;
    joinRoom: (
        wallet: AnchorWallet,
        gamePDA: PublicKey,
        gameState: OnChainGame,
        sessionParams?: SessionParams
    ) => Promise<boolean>;
    leaveRoom: (wallet: AnchorWallet) => Promise<boolean>;
    subscribeToGame: (wallet: AnchorWallet, gamePDA: PublicKey) => void;
    subscribeToPlayer: (wallet: AnchorWallet, gamePDA: PublicKey, userPubkey: PublicKey) => void;
    subscribeToAllPlayers: (wallet: AnchorWallet, gamePDA: PublicKey, playerPubkeys: PublicKey[]) => void;
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
    playerStateSource: null,
    currentPlayerPDA: null,
    remotePlayerStates: {},
    isCreating: false,
    isJoining: false,
    isLeaving: false,
    txSteps: [],
    error: null,
    _gameSubId: null,
    _playerSubId: null,
    _remotePlayerSubIds: [],

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

    createRoom: async (wallet, config, sessionParams) => {
        const hasSession = !!sessionParams;
        set({
            isCreating: true,
            error: null,
            txSteps: [
                { label: 'Creating room & joining as Player 1', status: 'pending' },
                {
                    label: hasSession
                        ? 'Delegating player & activating session'
                        : 'Delegating game to Ephemeral Rollup', status: 'pending'
                },
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

            // ── Step 2: delegate_player + session (bundled) ──
            set({ txSteps: updateStep(get().txSteps, 1, 'signing') });

            const delegatePlayerIx = await program.methods
                .delegatePlayer()
                .accountsPartial({
                    payer: wallet.publicKey,
                    player: playerPDA,
                })
                .remainingAccounts(getValidatorRemainingAccounts())
                .instruction();

            const delegateTx = new Transaction().add(delegatePlayerIx);

            console.log('[CreateRoom Step2] delegate_player ix built ✓');
            console.log('[CreateRoom Step2] delegate_player ix programId:', delegatePlayerIx.programId.toBase58());
            console.log('[CreateRoom Step2] delegate_player ix keys:', delegatePlayerIx.keys.length);

            // Append session creation instructions if provided
            if (sessionParams) {
                console.log('[CreateRoom Step2] Appending', sessionParams.instructions.length, 'session ixs');
                for (let i = 0; i < sessionParams.instructions.length; i++) {
                    const ix = sessionParams.instructions[i];
                    console.log(`[CreateRoom Step2] session ix[${i}] programId:`, ix.programId.toBase58(), 'keys:', ix.keys.length);
                    delegateTx.add(ix);
                }
                console.log('[CreateRoom Step2] tempKeypair pubkey:', sessionParams.tempKeypair.publicKey.toBase58());
            }

            console.log('[CreateRoom Step2] Total ix count:', delegateTx.instructions.length);

            delegateTx.feePayer = wallet.publicKey;
            delegateTx.recentBlockhash = (
                await connection.getLatestBlockhash()
            ).blockhash;

            // Sign with tempKeypair first (required signer for session)
            if (sessionParams) {
                delegateTx.partialSign(sessionParams.tempKeypair);
            }

            console.log('[CreateRoom Step2] Partial sign done, requesting wallet signature...');

            // Wallet signs
            const signedDelegateTx = await wallet.signTransaction(delegateTx);

            console.log('[CreateRoom Step2] Wallet signed ✓. Simulating before send...');

            // Simulate first to get logs on failure
            try {
                const simResult = await connection.simulateTransaction(signedDelegateTx);
                if (simResult.value.err) {
                    console.error('[CreateRoom Step2] ❌ SIMULATION FAILED');
                    console.error('[CreateRoom Step2] Error:', JSON.stringify(simResult.value.err));
                    console.error('[CreateRoom Step2] Logs:', simResult.value.logs);
                } else {
                    console.log('[CreateRoom Step2] ✅ Simulation passed. Units consumed:', simResult.value.unitsConsumed);
                }
            } catch (simErr: any) {
                console.error('[CreateRoom Step2] Simulation threw:', simErr.message);
            }

            const delegateTxHash = await connection.sendRawTransaction(
                signedDelegateTx.serialize(),
                { skipPreflight: true }
            );

            console.log('[CreateRoom Step2] Sent tx:', delegateTxHash, '— awaiting confirmation...');

            await connection.confirmTransaction(delegateTxHash, 'confirmed');

            console.log('[CreateRoom Step2] ✅ Confirmed:', delegateTxHash);
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
            console.error('[CreateRoom] ❌ FAILED:', err);
            console.error('[CreateRoom] Error name:', err.name);
            console.error('[CreateRoom] Error message:', err.message);
            if (err.logs) {
                console.error('[CreateRoom] Transaction logs:', err.logs);
            }
            if (err.transactionMessage) {
                console.error('[CreateRoom] Transaction message:', err.transactionMessage);
            }
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

    joinRoom: async (wallet, gamePDA, gameState, sessionParams) => {
        const hasSession = !!sessionParams;
        set({
            isJoining: true,
            error: null,
            txSteps: [
                { label: 'Joining room & staking SOL', status: 'pending' },
                {
                    label: hasSession
                        ? 'Delegating player & activating session'
                        : 'Delegating player to Ephemeral Rollup', status: 'pending'
                },
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

            // ── Step 2: delegate_player (+ delegate_game if last player) + session ──
            set({ txSteps: updateStep(get().txSteps, 1, 'signing') });

            const delegateTx = new Transaction();

            if (isLastPlayer) {
                // Last player also delegates the game state
                console.log('[JoinRoom Step2] 🎯 Last player joining — delegating GAME state to ER');
                const delegateGameIx = await program.methods
                    .delegateGame(gameData.gameId)
                    .accountsPartial({
                        payer: wallet.publicKey,
                        game: gamePDA,
                    })
                    .remainingAccounts(getValidatorRemainingAccounts())
                    .instruction();
                delegateTx.add(delegateGameIx);
            } else {
                console.log('[JoinRoom Step2] Not last player — only delegating PLAYER state');
            }

            const delegatePlayerIx = await program.methods
                .delegatePlayer()
                .accountsPartial({
                    payer: wallet.publicKey,
                    player: playerPDA,
                })
                .remainingAccounts(getValidatorRemainingAccounts())
                .instruction();
            delegateTx.add(delegatePlayerIx);

            // Append session creation instructions if provided
            if (sessionParams) {
                console.log('[JoinRoom Step2] Appending', sessionParams.instructions.length, 'session ixs');
                for (const ix of sessionParams.instructions) {
                    delegateTx.add(ix);
                }
            }

            console.log('[JoinRoom Step2] Total ix count:', delegateTx.instructions.length);

            delegateTx.feePayer = wallet.publicKey;
            delegateTx.recentBlockhash = (
                await connection.getLatestBlockhash()
            ).blockhash;

            // Sign with tempKeypair first (required signer for session)
            if (sessionParams) {
                delegateTx.partialSign(sessionParams.tempKeypair);
            }

            // Wallet signs
            const signedDelegateTx = await wallet.signTransaction(delegateTx);

            // Simulate before sending to capture any errors
            try {
                const simResult = await connection.simulateTransaction(signedDelegateTx);
                if (simResult.value.err) {
                    console.error('[JoinRoom Step2] ❌ SIMULATION FAILED');
                    console.error('[JoinRoom Step2] Error:', JSON.stringify(simResult.value.err));
                    if (simResult.value.logs) {
                        console.error('[JoinRoom Step2] Logs:');
                        simResult.value.logs.forEach((log, i) => console.error(`  [${i}] ${log}`));
                    }
                } else {
                    console.log('[JoinRoom Step2] ✅ Simulation passed. Units consumed:', simResult.value.unitsConsumed);
                }
            } catch (simErr: any) {
                console.warn('[JoinRoom Step2] Simulation threw:', simErr.message);
            }

            const delegateTxHash = await connection.sendRawTransaction(
                signedDelegateTx.serialize(),
                { skipPreflight: true }
            );
            await connection.confirmTransaction(delegateTxHash, 'confirmed');

            console.log('[JoinRoom Step2] ✅ delegate + session tx confirmed:', delegateTxHash);
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
            const [playerPDA] = derivePlayerPDA(currentGamePDA, wallet.publicKey);

            // Use session key to sign leave_room (avoids wallet genesis hash check)
            const tempKeypair = deriveTempKeypair(wallet.publicKey);

            // Derive session token PDA
            const SESSION_TOKEN_SEED = 'session_token';
            const GUM_SESSION_PROGRAM_ID = new PublicKey('KeyspM2ssCJbqUhQ4k7sveSiY4WjnYsrXkC8oDbwde5');
            const [sessionTokenPDA] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from(SESSION_TOKEN_SEED),
                    PROGRAM_ID.toBytes(),
                    tempKeypair.publicKey.toBytes(),
                    wallet.publicKey.toBuffer(),
                ],
                GUM_SESSION_PROGRAM_ID
            );

            // Build tx with ER program (accounts are on ER)
            const erProgram = getERProgram(wallet);
            const tx = await erProgram.methods
                .leaveRoom()
                .accountsPartial({
                    payer: tempKeypair.publicKey,
                    game: currentGamePDA,
                    player: playerPDA,
                    sessionToken: sessionTokenPDA,
                })
                .transaction();

            // Sign with tempKeypair (session key) and send to ER — NO wallet popup!
            const erConnection = getERConnection();
            const { value: { blockhash, lastValidBlockHeight } } =
                await erConnection.getLatestBlockhashAndContext();
            tx.recentBlockhash = blockhash;
            tx.feePayer = tempKeypair.publicKey;
            tx.sign(tempKeypair);

            const txHash = await erConnection.sendRawTransaction(
                tx.serialize(),
                { skipPreflight: true }
            );
            await erConnection.confirmTransaction(
                { blockhash, lastValidBlockHeight, signature: txHash },
                'confirmed'
            );

            console.log('leave_room tx:', txHash);

            // Clean up
            get().unsubscribeAll();
            set({
                isLeaving: false,
                currentGamePDA: null,
                currentGameId: null,
                currentGameState: null,
                currentPlayerState: null,
                playerStateSource: null,
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

                    // Sync property ownership from on-chain → game store
                    const ownerStrings = (decoded as OnChainGameState).propertyOwners.map(
                        (pk: PublicKey) => pk.toBase58()
                    );
                    useGameStore.getState().updateOwnershipFromChain(ownerStrings);
                    console.log('[Blockchain] 📡 Game subscription: synced property_owners →', ownerStrings.filter((s: string) => s !== '11111111111111111111111111111111').length, 'owned');
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

                // Sync ownership on initial fetch too
                const ownerStrings = (gameState as OnChainGameState).propertyOwners.map(
                    (pk: PublicKey) => pk.toBase58()
                );
                useGameStore.getState().updateOwnershipFromChain(ownerStrings);
            } catch (err) {
                // Try L1 if not yet on ER
                try {
                    const gameState = await (program.account as any).gameState.fetch(gamePDA);
                    set({ currentGameState: gameState as OnChainGameState });

                    const ownerStrings = (gameState as OnChainGameState).propertyOwners.map(
                        (pk: PublicKey) => pk.toBase58()
                    );
                    useGameStore.getState().updateOwnershipFromChain(ownerStrings);
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
                    const balance = typeof decoded.balance === 'object' && 'toNumber' in decoded.balance
                        ? (decoded.balance as any).toNumber()
                        : Number(decoded.balance);

                    console.log('[Blockchain] 📡 onAccountChange fired (subscription)', {
                        dice: decoded.lastDiceResult,
                        position: decoded.currentPosition,
                        balance,
                        hasShield: decoded.hasShield,
                        hasStakedDefi: decoded.hasStakedDefi,
                    });
                    set({ currentPlayerState: decoded as OnChainPlayerState, playerStateSource: 'subscription' });

                    // Sync local player state to game store (same pattern as subscribeToAllPlayers)
                    const walletKey = wallet.publicKey.toBase58();
                    useGameStore.getState().updatePlayerFromChain(walletKey, {
                        position: decoded.currentPosition,
                        balance,
                        hasShield: decoded.hasShield,
                        hasStakedDefi: decoded.hasStakedDefi,
                        hasPotion: decoded.hasPotion,
                        isInGraveyard: decoded.isInGraveyard,
                    });
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
                console.log('[Blockchain] 📋 Initial fetch (ER)', {
                    dice: playerState.lastDiceResult,
                    position: playerState.currentPosition,
                });
                set({ currentPlayerState: playerState as OnChainPlayerState, playerStateSource: 'initial_fetch' });
            } catch (err) {
                try {
                    const playerState = await (program.account as any).playerState.fetch(playerPDA);
                    console.log('[Blockchain] 📋 Initial fetch (L1)', {
                        dice: playerState.lastDiceResult,
                        position: playerState.currentPosition,
                    });
                    set({ currentPlayerState: playerState as OnChainPlayerState, playerStateSource: 'initial_fetch' });
                } catch {
                    console.error('Failed to fetch initial player state:', err);
                }
            }
        })();
    },

    // ─── Subscribe to All Players (Multiplayer Sync) ────────
    subscribeToAllPlayers: (wallet, gamePDA, playerPubkeys) => {
        const erConnection = getERConnection();
        const l1Connection = getL1Connection();
        const program = getProgram(l1Connection, wallet);
        const localPubkey = wallet.publicKey.toBase58();

        // Clean up previous remote subs
        const prevIds = get()._remotePlayerSubIds;
        for (const id of prevIds) {
            erConnection.removeAccountChangeListener(id);
        }

        const newSubIds: number[] = [];
        const newStates: Record<string, OnChainPlayerState> = {};

        for (const playerPubkey of playerPubkeys) {
            const playerPubkeyStr = playerPubkey.toBase58();
            // Skip local player (already subscribed via subscribeToPlayer)
            if (playerPubkeyStr === localPubkey) continue;

            const [playerPDA] = derivePlayerPDA(gamePDA, playerPubkey);

            // Subscribe to changes on ER
            const subId = erConnection.onAccountChange(
                playerPDA,
                (accountInfo) => {
                    try {
                        const decoded = (program.coder.accounts as any).decode(
                            'playerState',
                            accountInfo.data
                        ) as OnChainPlayerState;

                        // Update remote player states in blockchain store
                        const current = get().remotePlayerStates;
                        set({
                            remotePlayerStates: {
                                ...current,
                                [playerPubkeyStr]: decoded,
                            },
                        });

                        // Sync position + balance to game store for token movement
                        const balance = typeof decoded.balance === 'object' && 'toNumber' in decoded.balance
                            ? (decoded.balance as any).toNumber()
                            : Number(decoded.balance);

                        useGameStore.getState().updatePlayerFromChain(playerPubkeyStr, {
                            position: decoded.currentPosition,
                            balance,
                            hasShield: decoded.hasShield,
                            hasStakedDefi: decoded.hasStakedDefi,
                            hasPotion: decoded.hasPotion,
                            isInGraveyard: decoded.isInGraveyard,
                        });

                        console.log(`[RemoteSync] Player ${playerPubkeyStr.slice(0, 8)} → pos: ${decoded.currentPosition}, bal: ${balance}`);
                    } catch (err) {
                        console.error(`[RemoteSync] Failed to decode remote PlayerState for ${playerPubkeyStr.slice(0, 8)}:`, err);
                    }
                },
                'confirmed'
            );

            newSubIds.push(subId);

            // Initial fetch
            (async () => {
                try {
                    const erProgram = getERProgram(wallet);
                    const playerState = await (erProgram.account as any).playerState.fetch(playerPDA);
                    const decoded = playerState as OnChainPlayerState;
                    const current = get().remotePlayerStates;
                    set({
                        remotePlayerStates: { ...current, [playerPubkeyStr]: decoded },
                    });
                    newStates[playerPubkeyStr] = decoded;
                    console.log(`[RemoteSync] Initial fetch for ${playerPubkeyStr.slice(0, 8)} ✓`);
                } catch {
                    try {
                        const playerState = await (program.account as any).playerState.fetch(playerPDA);
                        const decoded = playerState as OnChainPlayerState;
                        const current = get().remotePlayerStates;
                        set({
                            remotePlayerStates: { ...current, [playerPubkeyStr]: decoded },
                        });
                        console.log(`[RemoteSync] Initial fetch (L1 fallback) for ${playerPubkeyStr.slice(0, 8)} ✓`);
                    } catch (err2) {
                        console.warn(`[RemoteSync] Initial fetch failed for ${playerPubkeyStr.slice(0, 8)}:`, err2);
                    }
                }
            })();
        }

        set({ _remotePlayerSubIds: newSubIds });
        console.log(`[RemoteSync] Subscribed to ${newSubIds.length} remote player(s)`);
    },

    unsubscribeAll: () => {
        const { _gameSubId, _playerSubId, _remotePlayerSubIds } = get();
        const erConnection = getERConnection();

        if (_gameSubId !== null) {
            erConnection.removeAccountChangeListener(_gameSubId);
        }
        if (_playerSubId !== null) {
            erConnection.removeAccountChangeListener(_playerSubId);
        }
        for (const id of _remotePlayerSubIds) {
            erConnection.removeAccountChangeListener(id);
        }

        set({
            _gameSubId: null,
            _playerSubId: null,
            _remotePlayerSubIds: [],
            remotePlayerStates: {},
        });
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
            playerStateSource: null,
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
