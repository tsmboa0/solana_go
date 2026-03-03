// ============================================================
// Game Actions Hook — Solvestor (SWS)
// ============================================================
// Provides on-chain gameplay actions that run on the Ephemeral
// Rollup using session keys. No wallet popups during gameplay.
//
// Actions: rollDice, buyProperty, performTileAction, endGame, fetchPlayerState
// ============================================================

import { useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import type { SessionKeyState } from '@/hooks/useSessionKey';
import {
    getL1Connection,
    getERConnection,
    getProgram,
    getERProgram,
    derivePlayerPDA,
} from '@/anchor/setup';
// NOTE: Gameplay actions (rollDice, buyProperty, performTileAction) use the ER program
// because all accounts are delegated to the ephemeral rollup.
import { useBlockchainStore, type OnChainPlayerState } from '@/stores/useBlockchainStore';

// ─── Hook ────────────────────────────────────────────────────

export interface GameActions {
    /** Roll dice (VRF request) — runs on ER with session key */
    rollDice: (clientSeed?: number) => Promise<string | null>;
    /** Buy a property tile — runs on ER with session key */
    buyProperty: (tileIndex: number) => Promise<string | null>;
    /** Perform tile action (landing effect) — runs on ER with session key */
    performTileAction: (tileIndex: number, chooseAction: boolean, ownerPDA?: PublicKey) => Promise<string | null>;
    /** End game — runs on ER, commits + undelegates back to L1 */
    endGame: () => Promise<string | null>;
    /** Manually fetch current player state from PDA (backup to subscription) */
    fetchPlayerState: () => Promise<OnChainPlayerState | null>;
    /** Whether actions are ready (session active, game subscribed) */
    isReady: boolean;
}

export function useGameActions(session: SessionKeyState): GameActions {
    const wallet = useAnchorWallet();
    const currentGamePDA = useBlockchainStore((s) => s.currentGamePDA);
    const currentGameId = useBlockchainStore((s) => s.currentGameId);

    const isReady = !!(
        wallet &&
        session.sessionActive &&
        session.tempKeypair &&
        session.sessionTokenPDA &&
        currentGamePDA
    );

    // ─── Roll Dice (VRF Request) ─────────────────────────────
    const rollDice = useCallback(async (clientSeed?: number): Promise<string | null> => {
        if (!wallet || !session.tempKeypair || !session.sessionTokenPDA || !currentGamePDA) {
            console.error('[GameActions] rollDice NOT READY:', {
                wallet: !!wallet,
                sessionActive: session.sessionActive,
                tempKeypair: !!session.tempKeypair,
                sessionTokenPDA: !!session.sessionTokenPDA,
                gamePDA: !!currentGamePDA,
            });
            return null;
        }

        try {
            const erProgram = getERProgram(wallet);
            const [playerPDA] = derivePlayerPDA(currentGamePDA, wallet.publicKey);

            const seed = clientSeed ?? Math.floor(Math.random() * 255);

            console.log('[GameActions] rollDice accounts:', {
                payer: session.tempKeypair.publicKey.toBase58(),
                game: currentGamePDA.toBase58(),
                player: playerPDA.toBase58(),
                sessionToken: session.sessionTokenPDA.toBase58(),
                wallet: wallet.publicKey.toBase58(),
                seed,
            });

            // Build the roll_dice instruction using ER program
            // payer = tempKeypair (session signer), sessionToken = sessionTokenPDA
            const tx = await erProgram.methods
                .rollDice(seed)
                .accountsPartial({
                    payer: session.tempKeypair.publicKey,
                    game: currentGamePDA,
                    player: playerPDA,
                    sessionToken: session.sessionTokenPDA,
                })
                .transaction();

            return await session.sendERTransaction(tx);
        } catch (err: any) {
            console.error('[GameActions] rollDice failed:', err);
            return null;
        }
    }, [wallet, session, currentGamePDA]);

    // ─── Buy Property ────────────────────────────────────────
    const buyProperty = useCallback(async (tileIndex: number): Promise<string | null> => {
        if (!wallet || !session.tempKeypair || !session.sessionTokenPDA || !currentGamePDA) {
            console.error('[GameActions] Not ready for buyProperty');
            return null;
        }

        try {
            const erProgram = getERProgram(wallet);
            const [playerPDA] = derivePlayerPDA(currentGamePDA, wallet.publicKey);

            console.log('[GameActions] 🏠 buyProperty request:', {
                tileIndex,
                payer: session.tempKeypair.publicKey.toBase58(),
                game: currentGamePDA.toBase58(),
                player: playerPDA.toBase58(),
            });

            const tx = await erProgram.methods
                .buyProperty(tileIndex)
                .accountsPartial({
                    payer: session.tempKeypair.publicKey,
                    game: currentGamePDA,
                    player: playerPDA,
                    sessionToken: session.sessionTokenPDA,
                })
                .transaction();

            const sig = await session.sendERTransaction(tx);
            console.log('[GameActions] ✅ buyProperty confirmed:', sig, '(tile:', tileIndex, ')');
            return sig;
        } catch (err: any) {
            console.error('[GameActions] ❌ buyProperty failed:', err);
            return null;
        }
    }, [wallet, session, currentGamePDA]);

    // ─── Perform Tile Action ─────────────────────────────────
    // For tiles with rent, the owner's PlayerState PDA must be
    // passed as remainingAccounts[0] (writable).
    const performTileAction = useCallback(async (
        tileIndex: number,
        chooseAction: boolean,
        ownerPDA?: PublicKey,
    ): Promise<string | null> => {
        if (!wallet || !session.tempKeypair || !session.sessionTokenPDA || !currentGamePDA) {
            console.error('[GameActions] Not ready for performTileAction');
            return null;
        }

        try {
            const erProgram = getERProgram(wallet);
            const [playerPDA] = derivePlayerPDA(currentGamePDA, wallet.publicKey);

            console.log('[GameActions] 🔗 performTileAction request:', {
                tileIndex,
                chooseAction,
                ownerPDA: ownerPDA?.toBase58() ?? 'none',
                payer: session.tempKeypair.publicKey.toBase58(),
            });

            let builder = erProgram.methods
                .performTileAction(tileIndex, chooseAction)
                .accountsPartial({
                    payer: session.tempKeypair.publicKey,
                    game: currentGamePDA,
                    player: playerPDA,
                    sessionToken: session.sessionTokenPDA,
                });

            // If an owner PDA is provided (for rent payment), add as remaining account
            if (ownerPDA) {
                builder = builder.remainingAccounts([
                    {
                        pubkey: ownerPDA,
                        isSigner: false,
                        isWritable: true,
                    },
                ]);
            }

            const tx = await builder.transaction();
            const sig = await session.sendERTransaction(tx);
            console.log('[GameActions] ✅ performTileAction confirmed:', sig, '(tile:', tileIndex, ', choose:', chooseAction, ')');
            return sig;
        } catch (err: any) {
            console.error('[GameActions] ❌ performTileAction failed:', err);
            return null;
        }
    }, [wallet, session, currentGamePDA]);

    // ─── End Game ────────────────────────────────────────────
    // Runs on ER — commits + undelegates GameState to L1
    // This is called by the wallet (not session key)
    const endGame = useCallback(async (): Promise<string | null> => {
        if (!wallet || !currentGamePDA || !currentGameId) {
            console.error('[GameActions] Not ready for endGame');
            return null;
        }

        try {
            const l1Connection = getL1Connection();
            const program = getProgram(l1Connection, wallet);
            const erConnection = getERConnection();

            // end_game requires player PDAs as remaining accounts for winner calculation
            const gameState = useBlockchainStore.getState().currentGameState;
            if (!gameState) return null;

            const remainingAccounts = gameState.players
                .filter((p: PublicKey) => !p.equals(PublicKey.default))
                .map((p: PublicKey) => {
                    const [playerPDA] = derivePlayerPDA(currentGamePDA, p);
                    return {
                        pubkey: playerPDA,
                        isSigner: false,
                        isWritable: true,
                    };
                });

            const tx = await program.methods
                .endGame(currentGameId)
                .accountsPartial({
                    user: wallet.publicKey,
                    game: currentGamePDA,
                })
                .remainingAccounts(remainingAccounts)
                .transaction();

            // end_game runs on ER but signs with wallet (not session)
            tx.feePayer = wallet.publicKey;
            tx.recentBlockhash = (await erConnection.getLatestBlockhash()).blockhash;

            const signedTx = await wallet.signTransaction(tx);
            const signature = await erConnection.sendRawTransaction(
                signedTx.serialize(),
                { skipPreflight: true }
            );
            await erConnection.confirmTransaction(signature, 'confirmed');

            console.log('[GameActions] endGame confirmed:', signature);
            return signature;
        } catch (err: any) {
            console.error('[GameActions] endGame failed:', err);
            return null;
        }
    }, [wallet, currentGamePDA, currentGameId]);

    // ─── Fetch Player State (Manual PDA Check) ───────────────
    const fetchPlayerState = useCallback(async (): Promise<OnChainPlayerState | null> => {
        if (!wallet || !currentGamePDA) {
            console.error('[GameActions] Not ready for fetchPlayerState');
            return null;
        }

        try {
            const [playerPDA] = derivePlayerPDA(currentGamePDA, wallet.publicKey);

            // Try ER first, then L1
            try {
                const erProgram = getERProgram(wallet);
                const playerState = await (erProgram.account as any).playerState.fetch(playerPDA);
                console.log('[GameActions] 📋 fetchPlayerState (ER):', {
                    dice: playerState.lastDiceResult,
                    position: playerState.currentPosition,
                    balance: playerState.balance?.toString(),
                });
                return playerState as OnChainPlayerState;
            } catch {
                const l1Connection = getL1Connection();
                const program = getProgram(l1Connection, wallet);
                const playerState = await (program.account as any).playerState.fetch(playerPDA);
                console.log('[GameActions] 📋 fetchPlayerState (L1):', {
                    dice: playerState.lastDiceResult,
                    position: playerState.currentPosition,
                    balance: playerState.balance?.toString(),
                });
                return playerState as OnChainPlayerState;
            }
        } catch (err: any) {
            console.error('[GameActions] fetchPlayerState failed:', err);
            return null;
        }
    }, [wallet, currentGamePDA]);

    return {
        rollDice,
        buyProperty,
        performTileAction,
        endGame,
        fetchPlayerState,
        isReady,
    };
}
