// ============================================================
// Game Page — Solvestor (SWS)
// ============================================================
// Contains the 3D GameScene and all UI overlays.
// Reads game mode from URL params (survives refresh).
// For beginner mode: subscribes to on-chain state via ER,
// manages session keys, and provides game actions context.
// ============================================================

import { createContext, useContext, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { AnimatePresence } from 'framer-motion';

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
import { WaitingOverlay } from '@/ui/WaitingOverlay';
import { SessionSetupOverlay } from '@/ui/SessionSetupOverlay';
import { CoinConfetti } from '@/ui/CoinConfetti';
import { EventCard } from '@/ui/EventCard';

import { useUIStore } from '@/stores/useUIStore';
import { useGameStore } from '@/stores/useGameStore';
import { useBlockchainStore } from '@/stores/useBlockchainStore';
import { useCPUPlayer } from '@/hooks/useCPUPlayer';
import { useAutoEndTurn } from '@/hooks/useAutoEndTurn';
import { useRemotePlayerSync } from '@/hooks/useRemotePlayerSync';
import { useSessionKey } from '@/hooks/useSessionKey';
import { useGameActions } from '@/hooks/useGameActions';
import type { SessionKeyState } from '@/hooks/useSessionKey';
import type { GameActions } from '@/hooks/useGameActions';
import { shortenPubkey } from '@/anchor/setup';

// ─── Game Actions Context (accessible by child components) ───

interface GameActionsContextValue {
    session: SessionKeyState;
    actions: GameActions;
}

const GameActionsContext = createContext<GameActionsContextValue | null>(null);

/** Hook for child components to access gameplay actions */
export function useGameActionsContext(): GameActionsContextValue | null {
    return useContext(GameActionsContext);
}

// ─── Component ───────────────────────────────────────────────

export function GamePage() {
    const theme = useUIStore((s) => s.theme);
    const { mode } = useParams<{ mode: string }>();
    const [searchParams] = useSearchParams();
    const wallet = useAnchorWallet();

    // Game store actions
    const setupExploreMode = useGameStore((s) => s.setupExploreMode);
    const setupBeginnerMode = useGameStore((s) => s.setupBeginnerMode);
    const isBeginnerMode = useGameStore((s) => s.isBeginnerMode);
    const resetGame = useGameStore((s) => s.resetGame);

    // Blockchain store state
    const currentGamePDA = useBlockchainStore((s) => s.currentGamePDA);
    const currentGameState = useBlockchainStore((s) => s.currentGameState);
    const subscribeToGame = useBlockchainStore((s) => s.subscribeToGame);
    const subscribeToPlayer = useBlockchainStore((s) => s.subscribeToPlayer);
    const setCurrentGame = useBlockchainStore((s) => s.setCurrentGame);
    const unsubscribeAll = useBlockchainStore((s) => s.unsubscribeAll);

    // Session keys + game actions (beginner mode only)
    const session = useSessionKey();
    const actions = useGameActions(session);

    // Parse game info from URL query params (for beginner mode)
    const gamePDAFromUrl = searchParams.get('gamePDA');
    const gameIdFromUrl = searchParams.get('gameId');

    const isBeginner = mode === 'beginner';
    const isExplore = mode === 'explore';

    // ─── Beginner mode: Restore game PDA from URL on mount/refresh ───
    useEffect(() => {
        if (!isBeginner || !wallet) return;
        if (!gamePDAFromUrl || !gameIdFromUrl) return;

        // Only set if not already set (e.g. from create/join flow)
        if (!currentGamePDA) {
            try {
                const pda = new PublicKey(gamePDAFromUrl);
                const gid = new BN(gameIdFromUrl);
                setCurrentGame(pda, gid);
            } catch (err) {
                console.error('Failed to parse game PDA from URL:', err);
            }
        }
    }, [isBeginner, wallet, gamePDAFromUrl, gameIdFromUrl, currentGamePDA, setCurrentGame]);

    // ─── Beginner mode: Subscribe to on-chain game + player state ───
    useEffect(() => {
        if (!isBeginner || !wallet || !currentGamePDA) return;

        subscribeToGame(wallet, currentGamePDA);
        subscribeToPlayer(wallet, currentGamePDA, wallet.publicKey);

        return () => {
            unsubscribeAll();
        };
    }, [isBeginner, wallet, currentGamePDA, subscribeToGame, subscribeToPlayer, unsubscribeAll]);

    // ─── Explore mode setup ───
    useEffect(() => {
        if (isExplore) {
            setupExploreMode();
        } else if (!isBeginner) {
            resetGame();
        }
    }, [mode, isExplore, isBeginner, setupExploreMode, resetGame]);

    // Activate CPU player logic (only runs when isExploreMode is true)
    useCPUPlayer();

    // Auto-end turns in async modes (explore + beginner)
    useAutoEndTurn();

    // Remote player sync (beginner mode only)
    useRemotePlayerSync();

    // ─── Beginner mode: Initialize game state when game starts ───
    useEffect(() => {
        if (!isBeginner || !wallet || !currentGameState) return;
        if (!currentGameState.isStarted) return;
        if (isBeginnerMode) return; // Already initialized

        // Find local wallet's index in the on-chain players array
        const onChainPlayers = currentGameState.players;
        const localIndex = onChainPlayers.findIndex(
            (pk: any) => {
                const pkStr = pk?.toBase58 ? pk.toBase58() : String(pk);
                return pkStr === wallet.publicKey.toBase58();
            }
        );

        if (localIndex === -1) {
            console.error('Local wallet not found in on-chain players array');
            return;
        }

        // Map on-chain players to setupBeginnerMode format
        const playerData = onChainPlayers.map((pk: any) => ({
            pubkey: pk?.toBase58 ? pk.toBase58() : String(pk),
            balance: typeof currentGameState.startCapital?.toNumber === 'function'
                ? currentGameState.startCapital.toNumber()
                : Number(currentGameState.startCapital || 1500),
            position: 0,
        }));

        setupBeginnerMode(localIndex, playerData);
        console.log(`[GamePage] Beginner mode initialized. Local player index: ${localIndex}`);
    }, [isBeginner, wallet, currentGameState, isBeginnerMode, setupBeginnerMode]);

    // ─── Beginner mode: Bridge fire-and-forget performTileAction events ───
    useEffect(() => {
        if (!isBeginner || !actions.isReady) return;

        const handler = (e: Event) => {
            const { tileIndex, chooseAction } = (e as CustomEvent).detail;
            actions.performTileAction(tileIndex, chooseAction).catch((err: any) => {
                console.error('[GamePage] Fire-and-forget performTileAction failed:', err);
            });
        };

        window.addEventListener('solvestor:performTileAction', handler);
        return () => window.removeEventListener('solvestor:performTileAction', handler);
    }, [isBeginner, actions]);

    // ─── Rush teleport handler (event card teleportation) ───
    useEffect(() => {
        const handler = (e: Event) => {
            const { playerId, targetPosition } = (e as CustomEvent).detail;
            useGameStore.getState().setPlayerPosition(playerId, targetPosition);
        };

        window.addEventListener('solvestor:rushTeleport', handler);
        return () => window.removeEventListener('solvestor:rushTeleport', handler);
    }, []);

    // ─── Determine overlays ───
    const showWaitingOverlay = useMemo(() => {
        if (!isBeginner || !currentGameState) return false;
        return !currentGameState.isStarted && !currentGameState.isEnded;
    }, [isBeginner, currentGameState]);

    // Show session setup overlay when game is started but session not yet created
    const showSessionSetup = useMemo(() => {
        if (!isBeginner || !currentGameState) return false;
        return currentGameState.isStarted && !session.sessionActive && !session.isSessionLoading;
    }, [isBeginner, currentGameState, session.sessionActive, session.isSessionLoading]);

    const roomCode = currentGamePDA ? shortenPubkey(currentGamePDA, 6) : '';

    // Wrap game actions context
    const contextValue = useMemo<GameActionsContextValue>(() => ({
        session,
        actions,
    }), [session, actions]);

    return (
        <GameActionsContext.Provider value={contextValue}>
            <div
                className={`w-full h-full no-select overflow-hidden ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
            >
                {/* 3D Scene (full-screen background) */}
                <GameScene />

                {/* 2D UI Overlays */}
                <HUD />
                <DiceButton />
                <TurnBanner />
                <BottomSheet />
                <TileActionPopup />
                <EventCard />
                <PortfolioModal />
                <EndTurnButton />
                <RecenterButton />

                {/* Coin confetti overlay (beginner mode optimistic effects) */}
                <CoinConfetti />

                {/* Loading splash — auto-fades after scene loads */}
                <GameLoadingOverlay />

                {/* Waiting for players overlay (beginner mode only) */}
                <AnimatePresence>
                    {showWaitingOverlay && currentGamePDA && currentGameState && (
                        <WaitingOverlay
                            playerCount={currentGameState.playerCount}
                            maxPlayers={currentGameState.maxPlayers}
                            gamePDA={currentGamePDA}
                            roomCode={roomCode}
                        />
                    )}
                </AnimatePresence>

                {/* Session setup overlay — shown when game starts but session not active */}
                <AnimatePresence>
                    {showSessionSetup && (
                        <SessionSetupOverlay
                            onCreateSession={session.createSession}
                            isLoading={session.isSessionLoading}
                            error={session.sessionError}
                        />
                    )}
                </AnimatePresence>
            </div>
        </GameActionsContext.Provider>
    );
}
