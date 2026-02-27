// ============================================================
// Dice Roll Hook — Solvestor (SWS)
// ============================================================
// Encapsulates dice rolling logic, coordinates with game + UI stores.
// Waits for physics-based dice settling signal instead of fixed timer.
//
// In explore mode:
//   1. Click GO → local Math.random() dice
//   2. Dice physics animate → token moves
//   3. Landing → predictTileAction() for instant result
//   4. Confetti for auto-resolved, popup for choices
//
// In beginner mode:
//   1. Click GO → send roll_dice on-chain (VRF request)
//   2. Show pending animation while waiting for VRF callback
//   3. VRF callback updates PlayerState.lastDiceResult + currentPosition
//   4. Detect the change → feed result into dice physics
//   5. Dice settle → move token → handle landing
//   6. Landing → predictTileAction() + fire on-chain in background
// ============================================================

import { useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { useUIStore } from '@/stores/useUIStore';
import { useCameraStore } from '@/stores/useCameraStore';
import { useBlockchainStore } from '@/stores/useBlockchainStore';
import { TOKEN_STEP_DURATION, POPUP_ACTION_DELAY_MS, BOARD_SIZE } from '@/config/game';
import { TILES } from '@/config/boardTiles';
import { predictTileAction, type PlayerLocalState, type TileActionResult } from '@/engine/tileActionMirror';
import { useCoinConfetti } from '@/hooks/useCoinConfetti';

// Tiles that only show EventCard once, then auto-resolve with confetti
const SEEN_ONCE_TILES = new Set([4, 10, 20, 22, 30, 36]); // Tax, Graveyard, Grant, MEV Bot, Liquidation, MEV Sandwich
const LS_KEY = 'solvestor-seen-tiles';

function getSeenTiles(): Set<number> {
    try {
        const raw = localStorage.getItem(LS_KEY);
        return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
}

export function markTileSeen(tileIndex: number) {
    const seen = getSeenTiles();
    seen.add(tileIndex);
    localStorage.setItem(LS_KEY, JSON.stringify([...seen]));
}

function isTileSeen(tileIndex: number): boolean {
    return getSeenTiles().has(tileIndex);
}

export function useDiceRoll() {
    const rollDice = useGameStore((s) => s.rollDice);
    const movePlayer = useGameStore((s) => s.movePlayer);
    const setPhase = useGameStore((s) => s.setPhase);
    const getCurrentPlayer = useGameStore((s) => s.getCurrentPlayer);
    const setDiceAnimating = useUIStore((s) => s.setDiceAnimating);
    const isDiceSettled = useUIStore((s) => s.isDiceSettled);
    const zoomOnLand = useCameraStore((s) => s.zoomOnLand);
    const showPopup = useUIStore((s) => s.showPopup);
    const showEventCard = useUIStore((s) => s.showEventCard);
    const ownedTiles = useGameStore((s) => s.ownedTiles);

    const isBeginnerMode = useGameStore((s) => s.isBeginnerMode);
    const isExploreMode = useGameStore((s) => s.isExploreMode);
    const currentPlayerState = useBlockchainStore((s) => s.currentPlayerState);

    const showCoinEffect = useCoinConfetti((s) => s.showCoinEffect);

    // Store the pending roll result so we can continue after settlement
    const pendingResult = useRef<{ playerId: string; total: number } | null>(null);

    // ─── Beginner mode: track VRF state ───
    const isWaitingVRF = useRef(false);
    const prevDiceResult = useRef<string | null>(null);
    const prevPosition = useRef<number | null>(null);

    // ─── performRoll ─────────────────────────────────────────
    const performRoll = useCallback(() => {
        if (isBeginnerMode) {
            isWaitingVRF.current = true;
            if (currentPlayerState) {
                prevDiceResult.current = JSON.stringify(currentPlayerState.lastDiceResult);
                prevPosition.current = currentPlayerState.currentPosition;
            }
            setPhase('rolling');
            setDiceAnimating(true);
            return;
        }

        // Explore mode: local random dice
        const player = getCurrentPlayer();
        if (!player) return;
        const result = rollDice();

        let finalSteps = result.total;
        if (player.isInGraveyard) {
            if (result.isDoubles) {
                // Escaped!
                useGameStore.getState().updatePlayerFromChain(player.id, { isInGraveyard: false });
            } else {
                // Failed to escape
                finalSteps = 0;
            }
        }

        setDiceAnimating(true);
        pendingResult.current = { playerId: player.id, total: finalSteps };
    }, [isBeginnerMode, rollDice, getCurrentPlayer, setDiceAnimating, setPhase, currentPlayerState]);

    // ─── Beginner mode: Watch for VRF callback ───────────────
    useEffect(() => {
        if (!isBeginnerMode || !isWaitingVRF.current || !currentPlayerState) return;

        const currentResult = JSON.stringify(currentPlayerState.lastDiceResult);
        const currentPos = currentPlayerState.currentPosition;

        if (prevDiceResult.current !== null && currentResult !== prevDiceResult.current) {
            isWaitingVRF.current = false;

            const die1 = currentPlayerState.lastDiceResult[0];
            const die2 = currentPlayerState.lastDiceResult[1];
            const total = die1 + die2;

            const oldPos = prevPosition.current ?? 0;
            const newPos = currentPos;
            let steps: number;
            if (newPos >= oldPos) {
                steps = newPos - oldPos;
            } else {
                steps = (BOARD_SIZE - oldPos) + newPos;
            }

            console.log(`[VRF] Dice result: ${die1} + ${die2} = ${total}, Steps: ${steps}, NewPos: ${newPos}`);

            const player = getCurrentPlayer();
            useGameStore.setState({
                lastDiceResult: { die1, die2, total, isDoubles: die1 === die2 },
            });

            pendingResult.current = { playerId: player.id, total: steps };
            prevDiceResult.current = currentResult;
            prevPosition.current = currentPos;
        }
    }, [isBeginnerMode, currentPlayerState, getCurrentPlayer]);

    // ─── Watch for dice to settle ────────────────────────────
    useEffect(() => {
        if (!isDiceSettled || !pendingResult.current) return;

        const currentState = useGameStore.getState();
        const currentPlayer = currentState.players[currentState.currentPlayerIndex];
        if (currentPlayer?.isCPU && !currentState.isBeginnerMode) return;

        const { playerId, total } = pendingResult.current;
        pendingResult.current = null;

        setDiceAnimating(false);

        // In beginner mode, sync balance from on-chain (GO bonus etc.)
        if (currentState.isBeginnerMode) {
            const playerState = useBlockchainStore.getState().currentPlayerState;
            if (playerState) {
                useGameStore.getState().updatePlayerFromChain(playerId, {
                    balance: typeof playerState.balance === 'object' && 'toNumber' in playerState.balance
                        ? (playerState.balance as any).toNumber()
                        : Number(playerState.balance),
                });
            }
        }

        movePlayer(playerId, total);
        setPhase('moving');

        // After token finishes moving, handle landing
        const moveDuration = total * TOKEN_STEP_DURATION * 1000;
        setTimeout(() => {
            const updatedPlayer = getCurrentPlayer();
            const landedTileIndex = updatedPlayer.position;

            setPhase('landed');
            zoomOnLand(landedTileIndex);

            setTimeout(() => {
                setPhase('action');

                // ─── Async modes (explore + beginner): optimistic tile action ───
                if (currentState.isBeginnerMode || currentState.isExploreMode) {
                    handleAsyncLanding(landedTileIndex, playerId, currentState);
                    return;
                }

                // ─── Fallback: turn-based popup flow ───
                const landedTile = TILES[landedTileIndex];
                const fn = landedTile.tile_function;
                if (fn.action_type === 'ownable') {
                    const owner = ownedTiles[landedTileIndex];
                    if (!owner) {
                        showPopup('buy', landedTileIndex);
                    } else if (owner !== playerId) {
                        showPopup('rent', landedTileIndex);
                    } else {
                        setPhase('turnEnd');
                    }
                } else if (fn.action_type === 'event') {
                    showPopup('event', landedTileIndex);
                } else if (fn.action_type === 'risk' || fn.action_type === 'defi') {
                    showPopup('tax', landedTileIndex);
                } else if (fn.action_type === 'corner') {
                    showPopup('corner', landedTileIndex);
                } else if (fn.action_type === 'neutral' || fn.action_type === 'privacy' || fn.action_type === 'governance') {
                    setPhase('turnEnd');
                }
            }, POPUP_ACTION_DELAY_MS);
        }, moveDuration + 300);
    }, [
        isDiceSettled,
        movePlayer,
        setPhase,
        getCurrentPlayer,
        setDiceAnimating,
        zoomOnLand,
        showPopup,
        ownedTiles,
        showCoinEffect,
    ]);

    // ─── Async landing handler (explore + beginner) ──────────
    // Uses predictTileAction() to show instant results with confetti.
    // Event/corner tiles: show EventCard popup for user to read + dismiss.
    // Choice tiles: show TileActionPopup for user decision.
    // Auto-resolved tiles: apply immediately with confetti.
    const handleAsyncLanding = useCallback((
        tileIndex: number,
        playerId: string,
        gameState: any,
    ) => {
        const lastDice = useGameStore.getState().lastDiceResult;
        const player = gameState.players.find((p: any) => p.id === playerId);
        const tile = TILES[tileIndex];
        const actionType = (tile?.tile_function as any)?.action_type;

        // ─── Build player state for prediction ───
        let localPlayer: PlayerLocalState;

        if (gameState.isBeginnerMode) {
            const onChainPlayer = useBlockchainStore.getState().currentPlayerState;
            localPlayer = {
                id: playerId,
                balance: player?.balance ?? 0,
                hasShield: onChainPlayer?.hasShield ?? false,
                hasStakedDefi: onChainPlayer?.hasStakedDefi ?? false,
                hasPotion: onChainPlayer?.hasPotion ?? false,
                isInGraveyard: onChainPlayer?.isInGraveyard ?? false,
            };
        } else {
            localPlayer = {
                id: playerId,
                balance: player?.balance ?? 0,
                hasShield: player?.hasShield ?? false,
                hasStakedDefi: player?.hasStakedDefi ?? false,
                hasPotion: player?.hasPotion ?? false,
                isInGraveyard: player?.isInGraveyard ?? false,
            };
        }

        const diceResult: [number, number] = lastDice
            ? [lastDice.die1, lastDice.die2]
            : [1, 1];

        // Build property owners map
        const propertyOwners: Record<number, string> = {};
        const owned = useGameStore.getState().ownedTiles;
        for (const [key, value] of Object.entries(owned)) {
            if (value) propertyOwners[Number(key)] = value;
        }

        // Predict tile action outcome
        const result = predictTileAction(
            tileIndex,
            localPlayer,
            diceResult,
            propertyOwners,
            tileIndex,
        );

        console.log(`[Mirror] Tile ${tileIndex}: ${result.message} (${result.effectType}, Δ${result.balanceChange})`);

        // ─── Choice tiles: show popup for user decision ───
        if (result.requiresChoice) {
            const fn = tile?.tile_function as any;
            if (fn?.action_type === 'ownable') {
                const owner = owned[tileIndex];
                if (!owner) {
                    showPopup('buy', tileIndex);
                } else {
                    showPopup('rent', tileIndex);
                }
            } else {
                showPopup('choice', tileIndex);
            }
            return;
        }

        // ─── Event tiles (chance/chest/pump.fun/conf): show EventCard ───
        if (actionType === 'event') {
            showEventCard(tileIndex, result);
            return;
        }

        // ─── Corner tiles with an effect (grant/liquidation): show EventCard ───
        if (actionType === 'corner') {
            const cornerType = (tile?.tile_function as any)?.corner_type;

            // GO is truly neutral — auto-resolve
            if (cornerType === 'go') {
                setPhase('turnEnd');
                return;
            }

            // Graveyard — show custom custom text
            if (cornerType === 'graveyard') {
                const customResult: TileActionResult = {
                    ...result,
                    message: 'Death is a lack of Imagination. Throw a double to escape.',
                    effectType: 'neutral'
                };
                if (SEEN_ONCE_TILES.has(tileIndex) && isTileSeen(tileIndex)) {
                    autoApplyResult(playerId, customResult, gameState, tileIndex);
                } else {
                    showEventCard(tileIndex, customResult);
                }
                return;
            }

            // Grant and Liquidation — show EventCard (or auto-resolve if seen)
            if (SEEN_ONCE_TILES.has(tileIndex) && isTileSeen(tileIndex)) {
                autoApplyResult(playerId, result, gameState, tileIndex);
            } else {
                showEventCard(tileIndex, result);
            }
            return;
        }

        // ─── Ownable tiles: show buy/rent popup ───
        if (actionType === 'ownable') {
            const owner = owned[tileIndex];
            if (!owner) {
                // Unowned — show buy popup
                showPopup('buy', tileIndex);
            } else if (owner !== playerId) {
                // Owned by another — rent is auto-resolved via mirror
                autoApplyResult(playerId, result, gameState, tileIndex);
            } else {
                // Own property — safe, end turn
                setPhase('turnEnd');
            }
            return;
        }

        // ─── All other tiles with an effect: show EventCard ───
        // (risk, tax, governance, school, etc.)
        if (result.balanceChange !== 0 || result.stateChanges || result.newPosition !== undefined) {
            // Auto-resolve if player has already seen this tile's card
            if (SEEN_ONCE_TILES.has(tileIndex) && isTileSeen(tileIndex)) {
                autoApplyResult(playerId, result, gameState, tileIndex);
            } else {
                showEventCard(tileIndex, result);
            }
            return;
        }

        // ─── Truly neutral tiles: no popup, just end turn ───
        // Beginner mode only: fire on-chain performTileAction in background
        if (gameState.isBeginnerMode) {
            fireOnChainTileAction(tileIndex, false);
        }

        setPhase('turnEnd');
    }, [showPopup, showEventCard, showCoinEffect, movePlayer, setPhase]);

    // ─── Auto-apply tile result without popup ────────────────
    // Used for already-seen tiles and rent.
    const autoApplyResult = useCallback((
        playerId: string,
        result: TileActionResult,
        gameState: any,
        tileIndex: number,
    ) => {
        if (result.balanceChange !== 0) {
            const type = result.balanceChange > 0 ? 'credit' : 'debit';
            showCoinEffect(Math.abs(result.balanceChange), type, result.message);
            const players = useGameStore.getState().players;
            const playerIdx = players.findIndex((p: any) => p.id === playerId);
            if (playerIdx !== -1) {
                useGameStore.getState().updatePlayerFromChain(playerId, {
                    balance: Math.max(0, players[playerIdx].balance + result.balanceChange),
                });
            }
        }
        if (result.stateChanges) {
            useGameStore.getState().updatePlayerFromChain(playerId, { ...result.stateChanges });
        }
        if (result.newPosition !== undefined) {
            const currentPos = useGameStore.getState().players.find((p: any) => p.id === playerId)?.position ?? 0;
            if (result.newPosition !== currentPos) {
                window.dispatchEvent(new CustomEvent('solvestor:rushTeleport', {
                    detail: { playerId, targetPosition: result.newPosition },
                }));
            }
        }
        if (gameState.isBeginnerMode) fireOnChainTileAction(tileIndex, false);
        setPhase('turnEnd');
    }, [showCoinEffect, setPhase]);

    // ─── Fire on-chain tile action (beginner mode only) ──────
    const fireOnChainTileAction = useCallback((tileIndex: number, chooseAction: boolean) => {
        setTimeout(() => {
            const event = new CustomEvent('solvestor:performTileAction', {
                detail: { tileIndex, chooseAction },
            });
            window.dispatchEvent(event);
        }, 100);
    }, []);

    return { performRoll, isWaitingForVRF: isWaitingVRF.current, fireOnChainTileAction };
}
