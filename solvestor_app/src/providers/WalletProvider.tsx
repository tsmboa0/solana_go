// ============================================================
// Solana Wallet Provider — Solvestor (SWS)
// ============================================================
// Wraps the app with Solana wallet adapter context.
// Configured for devnet.
// ============================================================

import { useMemo, type ReactNode } from 'react';
import { clusterApiUrl } from '@solana/web3.js';
import {
    ConnectionProvider,
    WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

// Default styles for the wallet adapter modal
import '@solana/wallet-adapter-react-ui/styles.css';

interface Props {
    children: ReactNode;
}

export function SolanaWalletProvider({ children }: Props) {
    const endpoint = useMemo(() => clusterApiUrl('devnet'), []);

    // Wallet adapters auto-detect installed wallets (Phantom, Solflare, etc.)
    const wallets = useMemo(() => [], []);

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}
