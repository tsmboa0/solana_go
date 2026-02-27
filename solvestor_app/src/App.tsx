// ============================================================
// App — Solvestor (SWS)
// ============================================================
// Root component with client-side routing.
// Landing → Mode Select → Lobby → Game
// ============================================================

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from '@/pages/LandingPage';
import { ModeSelectPage } from '@/pages/ModeSelectPage';
import { LobbyPage } from '@/pages/LobbyPage';
import { GamePage } from '@/pages/GamePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/select" element={<ModeSelectPage />} />
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/game/:mode" element={<GamePage />} />
      </Routes>
    </BrowserRouter>
  );
}
