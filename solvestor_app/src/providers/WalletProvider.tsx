// ============================================================
// Solana Wallet Provider — Solvestor (SWS)
// ============================================================
// Wraps the app with Solana wallet adapter context.
// Configured for devnet.
// ============================================================

import { useMemo, type ReactNode } from 'react';
// clusterApiUrl removed — using Helius directly for reliability
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
    const endpoint = useMemo(() => 'https://devnet.helius-rpc.com/?api-key=193b6782-795f-4f9f-a39c-838bfc136663', []);

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
