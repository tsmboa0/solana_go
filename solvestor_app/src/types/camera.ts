// ============================================================
// Camera Types — Solvestor (SWS)
// ============================================================

import type { Vector3Tuple } from 'three';

/** Camera operating mode */
export type CameraMode =
    | 'follow'    // Auto-follows active player token
    | 'free'      // User-controlled pan/rotate
    | 'overview'; // Zoomed-out board overview

/** Camera target state for smooth interpolation */
export interface CameraTarget {
    /** Camera position in world space */
    position: Vector3Tuple;
    /** Point camera looks at */
    lookAt: Vector3Tuple;
    /** Zoom factor (1 = default, >1 = zoomed in) */
    zoom: number;
}
