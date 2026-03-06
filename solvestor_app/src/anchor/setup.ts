// ============================================================
// Anchor Setup — Solvestor (SWS)
// ============================================================
// Program initialization, L1 + ER connections, PDA derivation
// helpers. Mirrors the patterns from the test file exactly.
// ============================================================

import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import type { AnchorWallet } from '@solana/wallet-adapter-react';

import idl from './idl/solvestor_program.json';

// ─── Constants ───────────────────────────────────────────────

export const PROGRAM_ID = new PublicKey('CGpK4bRB6DybtWXiTTHXaeoY8RGTCz3cPyHZShaboY23');

export const GAME_SEED = 'game';
export const PLAYER_SEED = 'player';
export const ESCROW_SEED = 'escrow';

/** MagicBlock Ephemeral Rollup (EU) */
export const ER_RPC_ENDPOINT = 'https://devnet-eu.magicblock.app/';
export const ER_WS_ENDPOINT = 'wss://devnet-eu.magicblock.app/';

/** EU Validator for delegation remainingAccounts */
export const EU_VALIDATOR = new PublicKey('MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e');

/** Devnet RPC (Vite exposes VITE_-prefixed env vars via import.meta.env) */
export const DEVNET_ENDPOINT = (import.meta as any).env?.VITE_RPC_URL || 'https://devnet.solana.com';

// ─── Connection Singletons ───────────────────────────────────

let _l1Connection: Connection | null = null;
let _erConnection: Connection | null = null;

export function getL1Connection(): Connection {
    if (!_l1Connection) {
        _l1Connection = new Connection(DEVNET_ENDPOINT, 'confirmed');
    }
    return _l1Connection;
}

export function getERConnection(): Connection {
    if (!_erConnection) {
        _erConnection = new Connection(ER_RPC_ENDPOINT, {
            wsEndpoint: ER_WS_ENDPOINT,
            commitment: 'confirmed',
        });
    }
    return _erConnection;
}

// ─── Program Factory ─────────────────────────────────────────

/**
 * Create an Anchor Program instance for L1 transactions.
 * Requires a connected wallet for signing.
 */
export function getProgram(connection: Connection, wallet: AnchorWallet) {
    const provider = new AnchorProvider(connection, wallet, {
        commitment: 'confirmed',
        skipPreflight: true,
    });
    return new Program(idl as any, provider);
}

/**
 * Create an Anchor Program instance for ER transactions.
 * Used for reading delegated account state on the ER.
 */
export function getERProgram(wallet: AnchorWallet) {
    const erConn = getERConnection();
    const provider = new AnchorProvider(erConn, wallet, {
        commitment: 'confirmed',
        skipPreflight: true,
    });
    return new Program(idl as any, provider);
}

// ─── PDA Derivation ──────────────────────────────────────────
// Mirrors the test file: solvestor_program.ts lines 144-174

export function deriveGamePDA(creatorPubkey: PublicKey, gameId: BN): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(GAME_SEED),
            creatorPubkey.toBuffer(),
            gameId.toArrayLike(Buffer, 'le', 8),
        ],
        PROGRAM_ID
    );
}

export function derivePlayerPDA(gamePDA: PublicKey, userPubkey: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(PLAYER_SEED),
            gamePDA.toBuffer(),
            userPubkey.toBuffer(),
        ],
        PROGRAM_ID
    );
}

export function deriveEscrowPDA(gamePDA: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(ESCROW_SEED),
            gamePDA.toBuffer(),
        ],
        PROGRAM_ID
    );
}

// ─── Validator Remaining Accounts ─────────────────────────────

/**
 * Returns the remainingAccounts array for delegation instructions.
 * Points to the EU validator on devnet.
 */
export function getValidatorRemainingAccounts() {
    return [
        {
            pubkey: EU_VALIDATOR,
            isSigner: false,
            isWritable: false,
        },
    ];
}

// ─── Helpers ─────────────────────────────────────────────────

/** Shorten a public key for display: "4xK2...mN8p" */
export function shortenPubkey(pubkey: PublicKey | string, chars = 4): string {
    const str = typeof pubkey === 'string' ? pubkey : pubkey.toBase58();
    return `${str.slice(0, chars)}...${str.slice(-chars)}`;
}

/** Convert lamports to SOL (with precision) */
export function lamportsToSol(lamports: number | bigint): number {
    return Number(lamports) / 1_000_000_000;
}

/** Convert SOL to lamports */
export function solToLamports(sol: number): number {
    return Math.round(sol * 1_000_000_000);
}

// ─── MagicAction Escrow ──────────────────────────────────────

import {
    escrowPdaFromEscrowAuthority,
    createTopUpEscrowInstruction,
    createCloseEscrowInstruction,
} from '@magicblock-labs/ephemeral-rollups-sdk';

/** Derive the MagicAction escrow PDA for a given authority (payer) */
export function deriveMagicActionEscrowPDA(authority: PublicKey): PublicKey {
    return escrowPdaFromEscrowAuthority(authority);
}

export { createTopUpEscrowInstruction, createCloseEscrowInstruction };
