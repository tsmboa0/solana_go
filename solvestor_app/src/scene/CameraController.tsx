// ============================================================
// Camera Controller — Solvestor (SWS)
// ============================================================
// Two modes:
//   1. FREE-LOOK (waiting) — OrbitControls enabled,
//      player can pan, rotate, and pinch-zoom to explore.
//      Default view: bird's-eye overview, board centered.
//   2. FOLLOW (rolling/moving/landed/action/turnEnd) — OrbitControls
//      disabled, camera auto-follows the token tile-by-tile
//      with direction-aware positioning (behind token, looking ahead).
//
// Recenter: call recenterCamera() from UI to snap back to overview.
// ============================================================

import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/stores/useGameStore';
import {
    BOARD_SIZE,
    CAMERA_LERP_FACTOR,
    CAMERA_ZOOM_LERP_MULTIPLIER,
    CAMERA_START_POSITION,
    CAMERA_START_TARGET,
    CAMERA_FOLLOW_OFFSET,
    CAMERA_FOLLOW_DISTANCE,
    CAMERA_LOOK_AHEAD_DISTANCE,
    CAMERA_ZOOM_OFFSET,
    CAMERA_MIN_DISTANCE,
    CAMERA_MAX_DISTANCE,
    CAMERA_MIN_POLAR,
    CAMERA_MAX_POLAR_DIVISOR,
    CAMERA_DAMPING_FACTOR,
} from '@/config/game';
import { TILE_LAYOUTS } from '@/utils/boardLayout';

// ─── Overview: bird's-eye position showing most of the board ───
const OVERVIEW_POSITION = new THREE.Vector3(...CAMERA_START_POSITION);
const BOARD_CENTER = new THREE.Vector3(...CAMERA_START_TARGET);

// ─── Zoom-on-land: closer offset from the tile ───
const ZOOM_OFFSET = new THREE.Vector3(...CAMERA_ZOOM_OFFSET);

// Polar angle max (prevent going below the board)
const MAX_POLAR = Math.PI / CAMERA_MAX_POLAR_DIVISOR;

// ─── Reusable temp vectors (avoid per-frame allocations) ───
const _tmpDir = new THREE.Vector3();
const _tmpTilePos = new THREE.Vector3();
const _tmpNextTilePos = new THREE.Vector3();

/**
 * Compute the travel direction for a tile (normalized XZ vector).
 * Uses the vector from current tile → next tile in the movement order.
 */
function getTravelDirection(tileIndex: number): THREE.Vector3 {
    const current = TILE_LAYOUTS[tileIndex];
    const nextIdx = (tileIndex + 1) % BOARD_SIZE;
    const next = TILE_LAYOUTS[nextIdx];
    if (!current || !next) return _tmpDir.set(0, 0, -1);

    _tmpTilePos.set(current.position[0], 0, current.position[2]);
    _tmpNextTilePos.set(next.position[0], 0, next.position[2]);

    _tmpDir.subVectors(_tmpNextTilePos, _tmpTilePos);
    // If same position (shouldn't happen), default forward
    if (_tmpDir.lengthSq() < 0.0001) return _tmpDir.set(0, 0, -1);
    _tmpDir.normalize();
    return _tmpDir;
}

// Expose recenter function globally so UI can call it
let _recenterFn: (() => void) | null = null;
export function recenterCamera() {
    _recenterFn?.();
}

export function CameraController() {
    const { camera } = useThree();
    const controlsRef = useRef<any>(null);

    const phase = useGameStore((s) => s.phase);
    const movingTileIndex = useGameStore((s) => s.movingTileIndex);
    const players = useGameStore((s) => s.players);
    const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);

    // --- Smooth interpolation targets (used in follow mode) ---
    const targetPosition = useRef(OVERVIEW_POSITION.clone());
    const targetLookAt = useRef(BOARD_CENTER.clone());
    const currentLookAt = useRef(BOARD_CENTER.clone());
    const lerpSpeed = useRef(CAMERA_LERP_FACTOR);

    // Whether the camera is in auto-follow mode
    const isFollowing = useRef(false);

    // Game start flag — stay at overview until first roll
    const isGameStart = useRef(true);

    // Smoothly interpolated travel direction
    const smoothDirection = useRef(new THREE.Vector3(0, 0, -1));

    // --- Pre-zoom save: restore after player buy/skip action ---
    const preZoomPosition = useRef<THREE.Vector3 | null>(null);
    const preZoomLookAt = useRef<THREE.Vector3 | null>(null);

    // Helper: get the active player's tile position
    const getPlayerTilePos = useCallback(() => {
        const player = players[currentPlayerIndex];
        if (!player) return null;
        const layout = TILE_LAYOUTS[player.position];
        if (!layout) return null;
        return new THREE.Vector3(layout.position[0], 0, layout.position[2]);
    }, [players, currentPlayerIndex]);

    // ─── Determine if camera should be in follow or free mode ───
    const isFreeLookPhase = phase === 'waiting';

    // ─── Enable/disable orbit controls based on phase ───
    useEffect(() => {
        if (controlsRef.current) {
            controlsRef.current.enabled = isFreeLookPhase;
        }
        // Camera is ALWAYS following targets (lerp always runs)
        isFollowing.current = true;
    }, [isFreeLookPhase]);

    // ─── Follow token tile-by-tile during movement ───
    useEffect(() => {
        if (movingTileIndex === null || phase !== 'moving') return;

        const layout = TILE_LAYOUTS[movingTileIndex];
        if (!layout) return;

        const tilePos = new THREE.Vector3(layout.position[0], 0, layout.position[2]);

        // Get the travel direction for this tile
        const dir = getTravelDirection(movingTileIndex);

        // Smoothly blend direction (avoids snappy corners)
        smoothDirection.current.lerp(dir, 0.3);
        smoothDirection.current.normalize();

        const sd = smoothDirection.current;

        // Position camera BEHIND the token (opposite of travel direction)
        // The lerp in useFrame handles smooth transition from wherever the camera is
        targetPosition.current.set(
            tilePos.x - sd.x * CAMERA_FOLLOW_DISTANCE,
            CAMERA_FOLLOW_OFFSET[1],
            tilePos.z - sd.z * CAMERA_FOLLOW_DISTANCE
        );

        // Look AHEAD of the token in the travel direction
        targetLookAt.current.set(
            tilePos.x + sd.x * CAMERA_LOOK_AHEAD_DISTANCE,
            0,
            tilePos.z + sd.z * CAMERA_LOOK_AHEAD_DISTANCE
        );
        lerpSpeed.current = CAMERA_LERP_FACTOR;
    }, [movingTileIndex, phase]);

    // ─── Zoom in on landing: save follow position first ───
    useEffect(() => {
        if (phase === 'landed' || phase === 'action') {
            const tilePos = getPlayerTilePos();
            if (!tilePos) return;

            // Save the follow position BEFORE zooming (only once)
            if (!preZoomPosition.current) {
                preZoomPosition.current = targetPosition.current.clone();
                preZoomLookAt.current = targetLookAt.current.clone();
            }

            // Zoom in closer to the tile
            targetPosition.current.copy(tilePos).add(ZOOM_OFFSET);
            targetLookAt.current.copy(tilePos);
            lerpSpeed.current = CAMERA_LERP_FACTOR * CAMERA_ZOOM_LERP_MULTIPLIER;
        }
    }, [phase, getPlayerTilePos]);

    // ─── On turnEnd: restore to pre-zoom follow position ───
    useEffect(() => {
        if (phase === 'turnEnd') {
            if (preZoomPosition.current && preZoomLookAt.current) {
                targetPosition.current.copy(preZoomPosition.current);
                targetLookAt.current.copy(preZoomLookAt.current);
                preZoomPosition.current = null;
                preZoomLookAt.current = null;
            }
            lerpSpeed.current = CAMERA_LERP_FACTOR;
        }
    }, [phase]);

    // ─── On turn start: move camera to current player's token ───
    useEffect(() => {
        if (phase === 'waiting') {
            // On game start, keep the overview position
            if (isGameStart.current) return;

            const player = players[currentPlayerIndex];
            if (!player) return;
            const layout = TILE_LAYOUTS[player.position];
            if (!layout) return;

            const [tx, , tz] = layout.position;

            // Compute follow position: behind the player's token in travel direction
            const dir = getTravelDirection(player.position);
            targetPosition.current.set(
                tx - dir.x * CAMERA_FOLLOW_DISTANCE,
                CAMERA_FOLLOW_OFFSET[1],
                tz - dir.z * CAMERA_FOLLOW_DISTANCE
            );

            // Look ahead of the token
            targetLookAt.current.set(
                tx + dir.x * CAMERA_LOOK_AHEAD_DISTANCE,
                0,
                tz + dir.z * CAMERA_LOOK_AHEAD_DISTANCE
            );
            lerpSpeed.current = CAMERA_LERP_FACTOR;

            // Sync orbit controls target
            if (controlsRef.current) {
                controlsRef.current.target.set(
                    tx + dir.x * CAMERA_LOOK_AHEAD_DISTANCE,
                    0,
                    tz + dir.z * CAMERA_LOOK_AHEAD_DISTANCE
                );
                controlsRef.current.update();
            }
        } else {
            // First time leaving waiting = game has started
            isGameStart.current = false;
        }
    }, [phase, currentPlayerIndex, players]);

    // ─── Recenter: snap back to board overview ───
    const recenter = useCallback(() => {
        if (!controlsRef.current) return;

        // Reset orbit target to board center
        controlsRef.current.target.copy(BOARD_CENTER);

        // Reset camera to overview position
        camera.position.copy(OVERVIEW_POSITION);
        controlsRef.current.update();
    }, [camera]);

    // Register recenter function globally
    useEffect(() => {
        _recenterFn = recenter;
        return () => { _recenterFn = null; };
    }, [recenter]);

    // ─── DEBUG: Log camera values every 1s for manual tuning ───
    const lastLogTime = useRef(0);

    // ─── Smooth interpolation each frame (only in follow mode) ───
    useFrame(() => {
        // Debug logging (throttled to every 1 second)
        const now = Date.now();
        if (now - lastLogTime.current > 1000) {
            lastLogTime.current = now;
            const p = camera.position;
            const t = controlsRef.current?.target;
            console.log(
                `📷 Camera: [${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}]` +
                (t ? `  |  🎯 Target: [${t.x.toFixed(2)}, ${t.y.toFixed(2)}, ${t.z.toFixed(2)}]` : '')
            );
        }

        if (!isFollowing.current) return;

        camera.position.lerp(targetPosition.current, lerpSpeed.current);
        currentLookAt.current.lerp(targetLookAt.current, lerpSpeed.current);
        camera.lookAt(currentLookAt.current);

        // Sync OrbitControls target so it's correct when re-enabled
        if (controlsRef.current) {
            controlsRef.current.target.copy(currentLookAt.current);
        }
    });

    return (
        <OrbitControls
            ref={controlsRef}
            // Touch gestures
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            // Zoom limits
            minDistance={CAMERA_MIN_DISTANCE}
            maxDistance={CAMERA_MAX_DISTANCE}
            // Polar limits (prevent going under the board)
            minPolarAngle={CAMERA_MIN_POLAR}
            maxPolarAngle={MAX_POLAR}
            // Smooth damping
            enableDamping={true}
            dampingFactor={CAMERA_DAMPING_FACTOR}
            // Touch settings
            touches={{
                ONE: THREE.TOUCH.ROTATE,
                TWO: THREE.TOUCH.DOLLY_PAN,
            }}
            // Mouse settings
            mouseButtons={{
                LEFT: THREE.MOUSE.ROTATE,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.PAN,
            }}
            // Start enabled for initial overview
            enabled={isFreeLookPhase}
        />
    );
}
