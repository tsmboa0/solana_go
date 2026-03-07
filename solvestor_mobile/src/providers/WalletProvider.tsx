// ============================================================
// Wallet Context — Solvestor Mobile
// ============================================================
// Provides wallet state + actions across the app.
// In development (Expo Go), uses a mock keypair.
// In production (dev build), uses Mobile Wallet Adapter.
// ============================================================

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { PublicKey, Keypair, Transaction, VersionedTransaction } from '@solana/web3.js';

// Attempt to load MWA — will fail gracefully in Expo Go
let mwaModule: typeof import('@solana-mobile/mobile-wallet-adapter-protocol-web3js') | null = null;
try {
    mwaModule = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
} catch {
    console.log('[Wallet] MWA module not available (Expo Go mode)');
}

// ─── Types ───────────────────────────────────────────────────

export interface WalletContextState {
    connected: boolean;
    publicKey: PublicKey | null;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
    signAllTransactions: <T extends Transaction | VersionedTransaction>(txs: T[]) => Promise<T[]>;
    connecting: boolean;
    shortAddress: string;
}

const WalletContext = createContext<WalletContextState | null>(null);

const MWA_IDENTITY = {
    name: 'Solana Go!',
    uri: 'https://solana-go.vercel.app',
    icon: 'favicon.ico',
};

// ─── Provider ────────────────────────────────────────────────

interface Props {
    children: ReactNode;
}

export function WalletProvider({ children }: Props) {
    const [connected, setConnected] = useState(false);
    const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
    const [connecting, setConnecting] = useState(false);
    const [devKeypair, setDevKeypair] = useState<Keypair | null>(null);

    const shortAddress = publicKey
        ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
        : '';

    const connect = useCallback(async () => {
        setConnecting(true);
        try {
            if (mwaModule) {
                // Production: Use MWA
                await mwaModule.transact(async (wallet: any) => {
                    const auth = await wallet.authorize({
                        identity: MWA_IDENTITY,
                        cluster: 'devnet',
                    });
                    setPublicKey(new PublicKey(auth.accounts[0].address));
                    setConnected(true);
                });
            } else {
                // Dev: Use generated keypair
                console.log('[Wallet] Using development keypair');
                const kp = Keypair.generate();
                setDevKeypair(kp);
                setPublicKey(kp.publicKey);
                setConnected(true);
            }
        } finally {
            setConnecting(false);
        }
    }, []);

    const disconnect = useCallback(async () => {
        setConnected(false);
        setPublicKey(null);
        setDevKeypair(null);
    }, []);

    const signTransaction = useCallback(
        async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
            if (devKeypair && tx instanceof Transaction) {
                tx.partialSign(devKeypair);
                return tx;
            }
            if (mwaModule) {
                let signed: T = tx;
                await mwaModule.transact(async (wallet: any) => {
                    await wallet.authorize({ identity: MWA_IDENTITY, cluster: 'devnet' });
                    const result = await wallet.signTransactions({ transactions: [tx] });
                    signed = result[0] as T;
                });
                return signed;
            }
            throw new Error('No wallet available');
        },
        [devKeypair],
    );

    const signAllTransactions = useCallback(
        async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => {
            if (devKeypair) {
                for (const tx of txs) {
                    if (tx instanceof Transaction) tx.partialSign(devKeypair);
                }
                return txs;
            }
            if (mwaModule) {
                let signed: T[] = txs;
                await mwaModule.transact(async (wallet: any) => {
                    await wallet.authorize({ identity: MWA_IDENTITY, cluster: 'devnet' });
                    const result = await wallet.signTransactions({ transactions: txs });
                    signed = result as T[];
                });
                return signed;
            }
            throw new Error('No wallet available');
        },
        [devKeypair],
    );

    return (
        <WalletContext.Provider
            value={{
                connected,
                publicKey,
                connect,
                disconnect,
                signTransaction,
                signAllTransactions,
                connecting,
                shortAddress,
            }}
        >
            {children}
        </WalletContext.Provider>
    );
}

// ─── Hook ────────────────────────────────────────────────────

export function useWallet(): WalletContextState {
    const ctx = useContext(WalletContext);
    if (!ctx) throw new Error('useWallet must be used within WalletProvider');
    return ctx;
}
