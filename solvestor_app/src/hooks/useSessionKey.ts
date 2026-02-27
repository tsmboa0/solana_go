// ============================================================
// Session Key Hook — Solvestor (SWS)
// ============================================================
// Manages MagicBlock session tokens for ER interactions.
// Based on the session-keys example from magicblock-engine-examples.
//
// Flow:
// 1. Derive tempKeypair from wallet publicKey (deterministic)
// 2. Initialize SessionTokenManager
// 3. Create session token (wallet + tempKeypair co-sign → L1)
// 4. All ER transactions sign with tempKeypair (no wallet popups)
// 5. Revoke session on cleanup
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import {
    Keypair,
    PublicKey,
    Connection,
    Transaction,
    TransactionInstruction,
    LAMPORTS_PER_SOL,
    SystemProgram,
} from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { AnchorProvider } from '@coral-xyz/anchor';
import { SessionTokenManager } from '@magicblock-labs/gum-sdk';
import {
    PROGRAM_ID,
    getL1Connection,
    getERConnection,
} from '@/anchor/setup';

// ─── Constants ───────────────────────────────────────────────

const SESSION_TOKEN_SEED = 'session_token';
const SESSION_VALIDITY_SECONDS = 36000; // 10 hour
const SESSION_TOPUP_LAMPORTS = 0.0005 * LAMPORTS_PER_SOL;

// ─── Hook ────────────────────────────────────────────────────

export interface SessionKeyState {
    /** Whether a valid session token exists on-chain */
    sessionActive: boolean;
    /** The temp keypair for signing ER transactions */
    tempKeypair: Keypair | null;
    /** The session token PDA */
    sessionTokenPDA: PublicKey | null;
    /** Whether session creation/revocation is in progress */
    isSessionLoading: boolean;
    /** Session-related error */
    sessionError: string | null;
    /** Create a new session token (wallet pops up once) */
    createSession: () => Promise<boolean>;
    /** Revoke the session token */
    revokeSession: () => Promise<boolean>;
    /** Sign and send a transaction via ER using the session key */
    sendERTransaction: (transaction: Transaction) => Promise<string | null>;
}

export function useSessionKey(): SessionKeyState {
    const wallet = useAnchorWallet();
    const { publicKey, signTransaction: walletSignTransaction } = useWallet();

    const tempKeypairRef = useRef<Keypair | null>(null);
    const sessionManagerRef = useRef<SessionTokenManager | null>(null);
    const sessionTokenPDARef = useRef<PublicKey | null>(null);
    const erConnectionRef = useRef<Connection | null>(null);

    const [sessionActive, setSessionActive] = useState(false);
    const [isSessionLoading, setIsSessionLoading] = useState(false);
    const [sessionError, setSessionError] = useState<string | null>(null);

    // ─── Derive tempKeypair from wallet publicKey ────────────
    useEffect(() => {
        if (!publicKey) return;

        // Deterministic: same wallet = same temp keypair
        const newTempKeypair = Keypair.fromSeed(publicKey.toBytes());
        tempKeypairRef.current = newTempKeypair;
        console.log('[Session] Temp keypair:', newTempKeypair.publicKey.toBase58());
    }, [publicKey]);

    // ─── Initialize ER connection ────────────────────────────
    useEffect(() => {
        if (!erConnectionRef.current) {
            erConnectionRef.current = getERConnection();
        }
    }, []);

    // ─── Initialize SessionTokenManager + check existence ────
    useEffect(() => {
        if (!publicKey || !tempKeypairRef.current || !wallet) return;

        const init = async () => {
            const l1Connection = getL1Connection();
            const provider = new AnchorProvider(l1Connection, wallet, {
                commitment: 'confirmed',
            });

            sessionManagerRef.current = new SessionTokenManager(
                provider as any,
                l1Connection
            );

            // Derive session token PDA
            const [pda] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from(SESSION_TOKEN_SEED),
                    PROGRAM_ID.toBytes(),
                    tempKeypairRef.current!.publicKey.toBytes(),
                    publicKey.toBuffer(),
                ],
                sessionManagerRef.current.program.programId
            );
            sessionTokenPDARef.current = pda;
            console.log('[Session] Token PDA:', pda.toBase58());

            // Check if session token already exists
            const accountInfo = await l1Connection.getAccountInfo(pda);
            setSessionActive(!!accountInfo);
            if (accountInfo) {
                console.log('[Session] Existing session token found');
            }
        };

        init().catch((err) => {
            console.error('[Session] Init error:', err);
        });
    }, [publicKey, wallet]);

    // ─── Ensure tempKeypair has SOL for tx fees on ER ────────
    const ensureTempFunded = useCallback(async () => {
        if (!tempKeypairRef.current) return;
        const l1Connection = getL1Connection();
        const info = await l1Connection.getAccountInfo(tempKeypairRef.current.publicKey);
        if (!info || info.lamports < 0.01 * LAMPORTS_PER_SOL) {
            console.log('[Session] Funding temp keypair...');
            // On devnet, we can airdrop
            try {
                await l1Connection.requestAirdrop(
                    tempKeypairRef.current.publicKey,
                    LAMPORTS_PER_SOL
                );
            } catch (err) {
                console.warn('[Session] Airdrop failed (may already have SOL):', err);
            }
        }
    }, []);

    // ─── Create Session ──────────────────────────────────────
    const createSession = useCallback(async (): Promise<boolean> => {
        if (!publicKey || !tempKeypairRef.current || !sessionManagerRef.current || !walletSignTransaction) {
            setSessionError('Wallet not connected or session manager not ready');
            return false;
        }

        setIsSessionLoading(true);
        setSessionError(null);

        try {
            // Ensure temp keypair has SOL
            await ensureTempFunded();

            const validUntilBN = new anchor.BN(
                Math.floor(Date.now() / 1000) + SESSION_VALIDITY_SECONDS
            );
            const topUpLamportsBN = new anchor.BN(SESSION_TOPUP_LAMPORTS);

            const walletTopUpIx = SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: tempKeypairRef.current.publicKey,
                lamports: 0.001 * LAMPORTS_PER_SOL,
            });

            const transaction = await sessionManagerRef.current.program.methods
                .createSession(true, validUntilBN, topUpLamportsBN)
                .accounts({
                    targetProgram: PROGRAM_ID,
                    sessionSigner: tempKeypairRef.current.publicKey,
                    authority: publicKey,
                })
                .transaction();

            const Tnx = new Transaction().add(walletTopUpIx, transaction);

            const l1Connection = getL1Connection();
            const { value: { blockhash, lastValidBlockHeight } } =
                await l1Connection.getLatestBlockhashAndContext();

            Tnx.recentBlockhash = blockhash;
            Tnx.feePayer = publicKey;

            // Sign with tempKeypair first (it's a required signer for the session)
            Tnx.sign(tempKeypairRef.current);

            // Then wallet signs
            const signedTx = await walletSignTransaction(Tnx);
            const signature = await l1Connection.sendRawTransaction(
                signedTx.serialize(),
                { skipPreflight: false }
            );
            await l1Connection.confirmTransaction(
                { blockhash, lastValidBlockHeight, signature },
                'confirmed'
            );

            console.log('[Session] Created:', signature);
            setSessionActive(true);
            setIsSessionLoading(false);
            return true;
        } catch (err: any) {
            console.error('[Session] Create failed:', err);
            setSessionError(`Session creation failed: ${err.message}`);
            setIsSessionLoading(false);
            return false;
        }
    }, [publicKey, walletSignTransaction, ensureTempFunded]);

    // ─── Revoke Session ──────────────────────────────────────
    const revokeSession = useCallback(async (): Promise<boolean> => {
        if (!publicKey || !sessionTokenPDARef.current || !sessionManagerRef.current || !walletSignTransaction) {
            return false;
        }

        setIsSessionLoading(true);
        setSessionError(null);

        try {
            const transaction = await sessionManagerRef.current.program.methods
                .revokeSession()
                .accounts({
                    sessionToken: sessionTokenPDARef.current,
                })
                .transaction();

            const l1Connection = getL1Connection();
            const { value: { blockhash, lastValidBlockHeight } } =
                await l1Connection.getLatestBlockhashAndContext();

            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;

            const signedTx = await walletSignTransaction(transaction);
            const signature = await l1Connection.sendRawTransaction(
                signedTx.serialize(),
                { skipPreflight: false }
            );
            await l1Connection.confirmTransaction(
                { blockhash, lastValidBlockHeight, signature },
                'confirmed'
            );

            console.log('[Session] Revoked:', signature);
            setSessionActive(false);
            setIsSessionLoading(false);
            return true;
        } catch (err: any) {
            console.error('[Session] Revoke failed:', err);
            setSessionError(`Session revocation failed: ${err.message}`);
            setIsSessionLoading(false);
            return false;
        }
    }, [publicKey, walletSignTransaction]);

    // ─── Send ER Transaction (with session key) ──────────────
    const sendERTransaction = useCallback(async (transaction: Transaction): Promise<string | null> => {
        if (!tempKeypairRef.current) {
            setSessionError('Temp keypair not available');
            return null;
        }

        const erConnection = erConnectionRef.current || getERConnection();

        try {
            // Add noop instruction BEFORE signing for tx uniqueness
            const noopInstruction = new TransactionInstruction({
                programId: new PublicKey('noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV'),
                keys: [],
                data: Buffer.from(crypto.getRandomValues(new Uint8Array(5))),
            });
            transaction.add(noopInstruction);

            const { value: { blockhash, lastValidBlockHeight } } =
                await erConnection.getLatestBlockhashAndContext();

            transaction.recentBlockhash = blockhash;
            transaction.feePayer = tempKeypairRef.current.publicKey;

            // Sign with temp keypair (session key) — NO wallet popup!
            transaction.sign(tempKeypairRef.current);

            const signature = await erConnection.sendRawTransaction(
                transaction.serialize(),
                { skipPreflight: true }
            );
            await erConnection.confirmTransaction(
                { blockhash, lastValidBlockHeight, signature },
                'confirmed'
            );

            console.log('[Session] ER tx confirmed:', signature);
            return signature;
        } catch (err: any) {
            console.error('[Session] ER tx failed:', err);
            setSessionError(`ER transaction failed: ${err.message}`);
            return null;
        }
    }, []);

    return {
        sessionActive,
        tempKeypair: tempKeypairRef.current,
        sessionTokenPDA: sessionTokenPDARef.current,
        isSessionLoading,
        sessionError,
        createSession,
        revokeSession,
        sendERTransaction,
    };
}
