// ============================================================
// Easing Functions — Solvestor (SWS)
// ============================================================
// Used for camera, token, and UI animations.
// ============================================================

/** Smooth deceleration: fast start, slow end */
export function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
}

/** Smooth acceleration then deceleration */
export function easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** Smooth acceleration */
export function easeInCubic(t: number): number {
    return t * t * t;
}

/** Spring-like bounce effect for landing */
export function springBounce(t: number): number {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
        ? 0
        : t === 1
            ? 1
            : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

/** Simple linear interpolation */
export function lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
}

/** Clamp value between min and max */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}
