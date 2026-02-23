// ============================================================
// App — Solvestor (SWS)
// ============================================================
// Root component: 3D GameScene as background,
// UI overlay components rendered on top.
// ============================================================

import { GameScene } from '@/scene/GameScene';
import { HUD } from '@/ui/HUD';
import { BottomSheet } from '@/ui/BottomSheet';
import { DiceButton } from '@/ui/DiceButton';
import { TileActionPopup } from '@/ui/TileActionPopup';
import { PortfolioModal } from '@/ui/PortfolioModal';
import { TurnBanner } from '@/ui/TurnBanner';
import { EndTurnButton } from '@/ui/EndTurnButton';
import { RecenterButton } from '@/ui/RecenterButton';
import { useUIStore } from '@/stores/useUIStore';

export default function App() {
  const theme = useUIStore((s) => s.theme);

  return (
    <div
      className={`w-full h-full no-select ${theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}
    >
      {/* 3D Scene (full-screen background) */}
      <GameScene />

      {/* 2D UI Overlays */}
      <HUD />
      <DiceButton />
      <TurnBanner />
      <BottomSheet />
      <TileActionPopup />
      <PortfolioModal />
      <EndTurnButton />
      <RecenterButton />
    </div>
  );
}
