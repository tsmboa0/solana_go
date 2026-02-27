// ============================================================
// Game Page — Solvestor (SWS)
// ============================================================
// Contains the 3D GameScene and all UI overlays.
// Reads game mode from URL params (survives refresh).
// ============================================================

import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { GameScene } from '@/scene/GameScene';
import { HUD } from '@/ui/HUD';
import { BottomSheet } from '@/ui/BottomSheet';
import { DiceButton } from '@/ui/DiceButton';
import { TileActionPopup } from '@/ui/TileActionPopup';
import { PortfolioModal } from '@/ui/PortfolioModal';
import { TurnBanner } from '@/ui/TurnBanner';
import { EndTurnButton } from '@/ui/EndTurnButton';
import { RecenterButton } from '@/ui/RecenterButton';
import { GameLoadingOverlay } from '@/ui/GameLoadingOverlay';
import { useUIStore } from '@/stores/useUIStore';
import { useGameStore } from '@/stores/useGameStore';
import { useCPUPlayer } from '@/hooks/useCPUPlayer';
import { useAutoEndTurn } from '@/hooks/useAutoEndTurn';

export function GamePage() {
    const theme = useUIStore((s) => s.theme);
    const { mode } = useParams<{ mode: string }>();
    const setupExploreMode = useGameStore((s) => s.setupExploreMode);
    const resetGame = useGameStore((s) => s.resetGame);

    // Set up game mode on mount — reads from URL params (survives refresh)
    useEffect(() => {
        if (mode === 'explore') {
            setupExploreMode();
        } else {
            resetGame();
        }
    }, [mode, setupExploreMode, resetGame]);

    // Activate CPU player logic (only runs when isExploreMode is true)
    useCPUPlayer();

    // Auto-end turns in explore mode (starts cooldown timer)
    useAutoEndTurn();

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

            {/* Loading splash — auto-fades after scene loads */}
            <GameLoadingOverlay />
        </div>
    );
}
