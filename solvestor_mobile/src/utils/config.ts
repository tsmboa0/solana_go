// ============================================================
// App Config — Solvestor Mobile
// ============================================================
// Centralized config for URLs, feature flags, and constants.
// ============================================================

import Constants from 'expo-constants';

/** Get the local IP for dev (from Expo manifest) */
function getDevHost(): string {
    const debuggerHost = Constants.expoConfig?.hostUri;
    if (debuggerHost) {
        return debuggerHost.split(':')[0]; // Extract IP from "IP:PORT"
    }
    return 'localhost';
}

export const APP_CONFIG = {
    /** Web app URL for WebView */
    webAppUrl: __DEV__
        ? `http://${getDevHost()}:5173`
        : 'https://solana-go.vercel.app',

    /** Solana RPC endpoint */
    rpcEndpoint: 'https://devnet.helius-rpc.com/?api-key=193b6782-795f-4f9f-a39c-838bfc136663',

    /** App version */
    version: Constants.expoConfig?.version ?? '1.0.0',
} as const;
