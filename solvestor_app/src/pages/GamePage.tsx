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
import { signalGameReady, isMobileNative, onNativeMessage, requestNavigateBack } from '@/utils/mobileBridge';
import { recenterCamera } from '@/scene/CameraController';

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
import { CoinConfetti } from '@/ui/CoinConfetti';
import { EventCard } from '@/ui/EventCard';
import { GameInfoPanel } from '@/ui/GameInfoPanel';
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
import { shortenPubkey, getERProgram, derivePlayerPDA } from '@/anchor/setup';

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
    const leaveGame = useGameStore((s) => s.leaveGame);
    const clearCurrentGame = useBlockchainStore((s) => s.clearCurrentGame);

    // Blockchain store state
    const currentGamePDA = useBlockchainStore((s) => s.currentGamePDA);
    const currentGameState = useBlockchainStore((s) => s.currentGameState);
    const subscribeToGame = useBlockchainStore((s) => s.subscribeToGame);
    const subscribeToPlayer = useBlockchainStore((s) => s.subscribeToPlayer);
    const subscribeToAllPlayers = useBlockchainStore((s) => s.subscribeToAllPlayers);
    const setCurrentGame = useBlockchainStore((s) => s.setCurrentGame);
    const unsubscribeAll = useBlockchainStore((s) => s.unsubscribeAll);

    // Parse game info from URL query params (for beginner mode)
    const gamePDAFromUrl = searchParams.get('gamePDA');
    const gameIdFromUrl = searchParams.get('gameId');

    const isBeginner = mode === 'beginner';
    const isExplore = mode === 'explore';

    // Session keys + game actions (beginner mode only — disabled in explore)
    const session = useSessionKey(isBeginner);
    const actions = useGameActions(session);

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
            // Signal native app that the game is ready
            if (isMobileNative()) signalGameReady();
        } else if (!isBeginner) {
            resetGame();
        }
    }, [mode, isExplore, isBeginner, setupExploreMode, resetGame]);

    // ─── Mobile bridge: expose recenter + handle native events ───
    useEffect(() => {
        if (!isMobileNative()) return;

        // Expose recenterCamera on window for native JS injection
        (window as any).__recenterCamera = recenterCamera;

        // Listen for native events (LEAVE_GAME, RECENTER_CAMERA)
        const cleanup = onNativeMessage((msg) => {
            if (msg.type === 'RECENTER_CAMERA') {
                recenterCamera();
            } else if (msg.type === 'LEAVE_GAME') {
                leaveGame();
                clearCurrentGame();
                requestNavigateBack();
            }
        });

        return () => {
            delete (window as any).__recenterCamera;
            cleanup();
        };
    }, [leaveGame, clearCurrentGame]);

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
        // Filter out empty/default pubkeys (unfilled player slots)
        const DEFAULT_PUBKEY = '11111111111111111111111111111111';
        const allOnChainPlayers = currentGameState.players;
        const realPlayers = allOnChainPlayers.filter((pk: any) => {
            const pkStr = pk?.toBase58 ? pk.toBase58() : String(pk);
            return pkStr !== DEFAULT_PUBKEY;
        });

        console.log('[GamePage] Real players:', realPlayers);

        const localIndex = realPlayers.findIndex(
            (pk: any) => {
                const pkStr = pk?.toBase58 ? pk.toBase58() : String(pk);
                return pkStr === wallet.publicKey.toBase58();
            }
        );

        if (localIndex === -1) {
            console.error('[GamePage] Local wallet not found in on-chain players array');
            return;
        }

        // Fetch each player's actual state from the ER (handles refresh mid-game)
        const gamePDA = currentGamePDA!;
        const erProgram = getERProgram(wallet);

        const fetchAndInit = async () => {
            const startBal = typeof currentGameState.startCapital?.toNumber === 'function'
                ? currentGameState.startCapital.toNumber()
                : Number(currentGameState.startCapital || 1500);

            const playerData = await Promise.all(
                realPlayers.map(async (pk: any) => {
                    const pubkeyStr = pk?.toBase58 ? pk.toBase58() : String(pk);
                    const playerPubkey = new PublicKey(pubkeyStr);
                    const [playerPDA] = derivePlayerPDA(gamePDA, playerPubkey);

                    try {
                        const state = await (erProgram.account as any).playerState.fetch(playerPDA);
                        const pos = typeof state.currentPosition === 'number'
                            ? state.currentPosition
                            : Number(state.currentPosition ?? 0);
                        const bal = typeof state.balance?.toNumber === 'function'
                            ? state.balance.toNumber()
                            : Number(state.balance ?? startBal);

                        console.log(`[GamePage] Fetched player ${pubkeyStr.slice(0, 8)}: pos=${pos}, bal=${bal}`);
                        return { pubkey: pubkeyStr, balance: bal, position: pos };
                    } catch (err) {
                        console.warn(`[GamePage] Could not fetch player ${pubkeyStr.slice(0, 8)} from ER, using defaults:`, err);
                        return { pubkey: pubkeyStr, balance: startBal, position: 0 };
                    }
                })
            );

            setupBeginnerMode(localIndex, playerData);

            // Subscribe to ALL players' on-chain PDAs for multiplayer sync
            // (subscribeToAllPlayers auto-skips the local player)
            subscribeToAllPlayers(wallet, gamePDA, realPlayers);

            console.log(`[GamePage] Beginner mode initialized. ${realPlayers.length} players, local index: ${localIndex}`);
        };

        fetchAndInit().catch((err) => {
            console.error('[GamePage] Failed to initialize beginner mode:', err);
        });
    }, [isBeginner, wallet, currentGameState, isBeginnerMode, setupBeginnerMode, subscribeToAllPlayers, currentGamePDA]);

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

    // ─── Beginner mode: Poll game + player state from ER every 5s ───
    useEffect(() => {
        if (!isBeginner || !wallet || !currentGamePDA) return;

        const pollInterval = setInterval(async () => {
            try {
                const erProgram = getERProgram(wallet);
                const [playerPDA] = derivePlayerPDA(currentGamePDA, wallet.publicKey);

                // Fetch player state from ER
                const playerState = await (erProgram.account as any).playerState.fetch(playerPDA);

                // Update the store with fresh ER data
                useBlockchainStore.setState({
                    currentPlayerState: playerState,
                    playerStateSource: 'poll' as any,
                });
            } catch (err) {
                console.warn('[Poll] ER poll failed:', err);
            }
        }, 15000);

        return () => {
            clearInterval(pollInterval);
        };
    }, [isBeginner, wallet, currentGamePDA]);

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
                <GameInfoPanel />

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


            </div>
        </GameActionsContext.Provider>
    );
}
