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
import { useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import type { AnchorWallet } from '@solana/wallet-adapter-react';
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
const SESSION_VALIDITY_SECONDS = 21600; // 6 hours — enough for any game session
const SESSION_TOPUP_LAMPORTS = 0.0005 * LAMPORTS_PER_SOL;
const SESSION_WALLET_TOPUP = 0.001 * LAMPORTS_PER_SOL;

// ─── Standalone Helpers (importable by blockchain store) ──────

/**
 * Deterministically derive a temp keypair from a wallet's public key.
 * Same wallet always produces the same temp keypair.
 */
export function deriveTempKeypair(walletPubkey: PublicKey): Keypair {
    return Keypair.fromSeed(walletPubkey.toBytes());
}

/**
 * Build session creation instructions without signing or sending.
 * ALWAYS revokes any existing session and creates a fresh one (6h validity).
 * This guarantees a valid session for the full game duration.
 *
 * Callers (e.g. useBlockchainStore) bundle these into a delegation tx.
 */
export async function buildSessionCreationIxs(
    walletPubkey: PublicKey,
    walletAdapter: AnchorWallet,
): Promise<{
    instructions: TransactionInstruction[];
    tempKeypair: Keypair;
}> {
    const tempKeypair = deriveTempKeypair(walletPubkey);
    const l1Connection = getL1Connection();
    const provider = new AnchorProvider(l1Connection, walletAdapter, {
        commitment: 'confirmed',
    });

    const sessionManager = new SessionTokenManager(
        provider as any,
        l1Connection
    );

    // Derive session token PDA
    const [sessionPDA] = PublicKey.findProgramAddressSync(
        [
            Buffer.from(SESSION_TOKEN_SEED),
            PROGRAM_ID.toBytes(),
            tempKeypair.publicKey.toBytes(),
            walletPubkey.toBuffer(),
        ],
        sessionManager.program.programId
    );

    const instructions: TransactionInstruction[] = [];

    // If a session already exists, revoke it first (no matter what)
    const existingAccount = await l1Connection.getAccountInfo(sessionPDA);
    if (existingAccount) {
        console.log('[Session] Existing session found — revoking before creating fresh one...');
        const revokeIx = await sessionManager.program.methods
            .revokeSession()
            .accounts({
                sessionToken: sessionPDA,
            })
            .instruction();
        instructions.push(revokeIx);
    } else {
        console.log('[Session] No existing session — creating fresh...');
    }

    // Fund the temp keypair
    const walletTopUpIx = SystemProgram.transfer({
        fromPubkey: walletPubkey,
        toPubkey: tempKeypair.publicKey,
        lamports: SESSION_WALLET_TOPUP,
    });
    instructions.push(walletTopUpIx);

    // Create fresh session token (6 hour validity)
    const validUntilBN = new anchor.BN(
        Math.floor(Date.now() / 1000) + SESSION_VALIDITY_SECONDS
    );
    const topUpLamportsBN = new anchor.BN(SESSION_TOPUP_LAMPORTS);

    const sessionIx = await sessionManager.program.methods
        .createSession(true, validUntilBN, topUpLamportsBN)
        .accounts({
            targetProgram: PROGRAM_ID,
            sessionSigner: tempKeypair.publicKey,
            authority: walletPubkey,
        })
        .instruction();
    instructions.push(sessionIx);

    console.log(`[Session] Built ${instructions.length} session ixs (${existingAccount ? 'revoke+' : ''}fund+create, valid 6h)`);

    return {
        instructions,
        tempKeypair,
    };
}

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
    /** Mark session as active externally (after bundled tx succeeds) */
    markSessionActive: () => void;
}

export function useSessionKey(enabled: boolean = true): SessionKeyState {
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
        if (!enabled || !publicKey) return;

        // Deterministic: same wallet = same temp keypair
        const newTempKeypair = deriveTempKeypair(publicKey);
        tempKeypairRef.current = newTempKeypair;
        console.log('[Session] Temp keypair:', newTempKeypair.publicKey.toBase58());
    }, [publicKey, enabled]);

    // ─── Initialize ER connection ────────────────────────────
    useEffect(() => {
        if (!enabled) return;
        if (!erConnectionRef.current) {
            erConnectionRef.current = getERConnection();
        }
    }, [enabled]);

    // ─── Initialize SessionTokenManager + check existence ────
    useEffect(() => {
        if (!enabled || !publicKey || !tempKeypairRef.current || !wallet) return;

        let cancelled = false;

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

            // Check if session token exists — retry up to 5 times
            // (handles race condition when session was just created in bundled tx)
            const MAX_RETRIES = 5;
            const RETRY_DELAY_MS = 1500;

            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                if (cancelled) return;
                const accountInfo = await l1Connection.getAccountInfo(pda);
                if (accountInfo) {
                    // Check if session is still valid (not expired)
                    try {
                        const decoded = sessionManagerRef.current!.program.coder.accounts.decode(
                            'sessionToken',
                            accountInfo.data
                        );
                        const validUntil = (decoded.validUntil as anchor.BN).toNumber();
                        const now = Math.floor(Date.now() / 1000);

                        if (validUntil <= now) {
                            console.warn(`[Session] ⚠ Session token found but EXPIRED (validUntil: ${new Date(validUntil * 1000).toISOString()})`);
                            console.warn('[Session] Next create/join room will auto-revoke and recreate');
                            setSessionActive(false);
                            return;
                        }

                        console.log(`[Session] ✅ Session token found and valid until ${new Date(validUntil * 1000).toISOString()} (attempt ${attempt})`);
                    } catch {
                        console.log(`[Session] ✅ Session token found (attempt ${attempt}) — could not decode expiry`);
                    }
                    setSessionActive(true);
                    return;
                }
                if (attempt < MAX_RETRIES) {
                    console.log(`[Session] Session token not found (attempt ${attempt}/${MAX_RETRIES}), retrying in ${RETRY_DELAY_MS}ms...`);
                    await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
                }
            }

            console.warn('[Session] ⚠ No session token found after retries — VRF calls will fail until session is created');
            setSessionActive(false);
        };

        init().catch((err) => {
            console.error('[Session] Init error:', err);
        });

        return () => { cancelled = true; };
    }, [publicKey, wallet, enabled]);

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
                lamports: SESSION_WALLET_TOPUP,
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

    // ─── Mark Session Active (external) ──────────────────────
    const markSessionActive = useCallback(() => {
        setSessionActive(true);
        console.log('[Session] Marked active externally (bundled tx)');
    }, []);

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

            // ── Simulate BEFORE sending to capture program logs ──
            try {
                const simResult = await erConnection.simulateTransaction(transaction);
                if (simResult.value.err) {
                    console.error('[Session] ❌ ER SIMULATION FAILED');
                    console.error('[Session] Error:', JSON.stringify(simResult.value.err));
                    if (simResult.value.logs) {
                        console.error('[Session] Program Logs:');
                        simResult.value.logs.forEach((log, i) => console.error(`  [${i}] ${log}`));
                    }
                    setSessionError(`ER simulation failed: ${JSON.stringify(simResult.value.err)}`);
                    return null;
                } else {
                    console.log('[Session] ✅ ER Simulation passed. Units consumed:', simResult.value.unitsConsumed);
                    if (simResult.value.logs) {
                        console.log('[Session] Program Logs:');
                        simResult.value.logs.forEach((log, i) => console.log(`  [${i}] ${log}`));
                    }
                }
            } catch (simErr: any) {
                console.warn('[Session] ⚠ Simulation threw (proceeding anyway):', simErr.message);
            }

            const signature = await erConnection.sendRawTransaction(
                transaction.serialize(),
                { skipPreflight: true }
            );
            await erConnection.confirmTransaction(
                { blockhash, lastValidBlockHeight, signature },
                'confirmed'
            );

            console.log('[Session] ✅ ER tx confirmed:', signature);
            return signature;
        } catch (err: any) {
            console.error('[Session] ❌ ER tx failed:', err);
            if (err.logs) {
                console.error('[Session] Transaction logs:');
                err.logs.forEach((log: string, i: number) => console.error(`  [${i}] ${log}`));
            }
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
        markSessionActive,
    };
}
