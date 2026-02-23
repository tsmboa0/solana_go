// ============================================================
// Sound Manager Hook — Solvestor (SWS)
// ============================================================
// Scaffolded API for sound effects.
// Currently logs to console — plug in audio files later.
// ============================================================

import { useCallback } from 'react';

export type SoundEffect =
    | 'dice_roll'
    | 'token_step'
    | 'token_land'
    | 'purchase'
    | 'rent_paid'
    | 'event_draw'
    | 'turn_start'
    | 'balance_up'
    | 'balance_down';

/**
 * Sound manager hook.
 * Replace the console.log with actual audio playback when ready.
 */
export function useSoundManager() {
    const play = useCallback((effect: SoundEffect) => {
        // TODO: Replace with actual audio playback
        // e.g., new Audio(`/sounds/${effect}.mp3`).play()
        if (import.meta.env.DEV) {
            console.log(`🔊 Sound: ${effect}`);
        }
    }, []);

    return { play };
}
