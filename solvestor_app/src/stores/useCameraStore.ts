// ============================================================
// Camera Store — Solvestor (SWS)
// ============================================================
// Camera target, mode, and transition state.
// Consumed by CameraController in the 3D scene.
// ============================================================

import { create } from 'zustand';
import type { CameraMode, CameraTarget } from '@/types/camera';
import { TILE_LAYOUTS } from '@/utils/boardLayout';
import {
    CAMERA_FOLLOW_HEIGHT,
    CAMERA_ZOOM_ON_LAND,
    CAMERA_START_POSITION,
    CAMERA_START_TARGET,
    CAMERA_FOLLOW_OFFSET,
    CAMERA_ZOOM_OFFSET,
} from '@/config/game';

interface CameraState {
    mode: CameraMode;
    target: CameraTarget;
    isTransitioning: boolean;

    setMode: (mode: CameraMode) => void;
    setTarget: (target: CameraTarget) => void;
    focusOnTile: (tileIndex: number, zoom?: number) => void;
    followPlayer: (tileIndex: number) => void;
    zoomOnLand: (tileIndex: number) => void;
    goToOverview: () => void;
}

const DEFAULT_TARGET: CameraTarget = {
    position: [...CAMERA_START_POSITION],
    lookAt: [...CAMERA_START_TARGET],
    zoom: 1,
};

export const useCameraStore = create<CameraState>()((set) => ({
    mode: 'follow',
    target: DEFAULT_TARGET,
    isTransitioning: false,

    setMode: (mode: CameraMode) => set({ mode }),

    setTarget: (target: CameraTarget) =>
        set({ target, isTransitioning: true }),

    focusOnTile: (tileIndex: number, zoom = 1) => {
        const layout = TILE_LAYOUTS[tileIndex];
        if (!layout) return;
        const [tx, , tz] = layout.position;
        set({
            target: {
                position: [
                    tx + CAMERA_FOLLOW_OFFSET[0],
                    CAMERA_FOLLOW_HEIGHT,
                    tz + CAMERA_FOLLOW_OFFSET[2],
                ],
                lookAt: [tx, 0, tz],
                zoom,
            },
            isTransitioning: true,
        });
    },

    followPlayer: (tileIndex: number) => {
        const layout = TILE_LAYOUTS[tileIndex];
        if (!layout) return;
        const [tx, , tz] = layout.position;
        set({
            target: {
                position: [
                    tx + CAMERA_FOLLOW_OFFSET[0],
                    CAMERA_FOLLOW_HEIGHT,
                    tz + CAMERA_FOLLOW_OFFSET[2],
                ],
                lookAt: [tx, 0, tz],
                zoom: 1,
            },
            mode: 'follow',
            isTransitioning: true,
        });
    },

    zoomOnLand: (tileIndex: number) => {
        const layout = TILE_LAYOUTS[tileIndex];
        if (!layout) return;
        const [tx, , tz] = layout.position;
        set({
            target: {
                position: [
                    tx + CAMERA_ZOOM_OFFSET[0],
                    CAMERA_ZOOM_OFFSET[1],
                    tz + CAMERA_ZOOM_OFFSET[2],
                ],
                lookAt: [tx, 0, tz],
                zoom: CAMERA_ZOOM_ON_LAND,
            },
            isTransitioning: true,
        });
    },

    goToOverview: () =>
        set({
            target: {
                position: [...CAMERA_START_POSITION],
                lookAt: [...CAMERA_START_TARGET],
                zoom: 1,
            },
            mode: 'overview',
            isTransitioning: true,
        }),
}));
