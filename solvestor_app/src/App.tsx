// ============================================================
// App — Solvestor (SWS)
// ============================================================
// Root component with client-side routing.
// Landing → Mode Select → Lobby → Game
// All routes except Landing require a connected wallet.
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { LandingPage } from '@/pages/LandingPage';
import { ModeSelectPage } from '@/pages/ModeSelectPage';
import { LobbyPage } from '@/pages/LobbyPage';
import { GamePage } from '@/pages/GamePage';

/**
 * Redirects to landing page if wallet is not connected.
 * On page refresh, the wallet adapter auto-reconnects from localStorage.
 * During this brief reconnection window, `connected` is false but `wallet`
 * is already set (from localStorage). We treat "wallet selected but not yet
 * connected" as "still connecting" and render nothing instead of redirecting.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { connected, wallet, connecting } = useWallet();

  // When running inside the native mobile WebView, the wallet is managed
  // by the native app — bypass the browser wallet check.
  // The __SOLVESTOR_NATIVE__ flag is injected by our bridge JS before content
  // loads (injectedJavaScriptBeforeContentLoaded), so it can't be set by
  // regular web visitors.
  if ((window as any).__SOLVESTOR_NATIVE__) {
    return <>{children}</>;
  }

  // Wallet adapter is still auto-reconnecting — don't redirect yet
  if (!connected && (connecting || wallet)) {
    return null;
  }

  // Truly not connected (no wallet selected at all) — redirect
  if (!connected) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/select" element={<ProtectedRoute><ModeSelectPage /></ProtectedRoute>} />
        <Route path="/lobby" element={<ProtectedRoute><LobbyPage /></ProtectedRoute>} />
        <Route path="/game/:mode" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
