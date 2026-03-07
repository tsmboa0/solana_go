// ============================================================
// Sound Manager — Solvestor Mobile
// ============================================================
// Lightweight haptic + sound feedback system.
// Centralized so all screens use consistent feedback patterns.
// ============================================================

import * as Haptics from 'expo-haptics';

// ─── Haptic Patterns ─────────────────────────────────────────

export const haptic = {
    /** Light tap — navigation, toggle, minor interaction */
    tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),

    /** Medium press — button press, card select */
    press: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),

    /** Heavy impact — important action, dice roll */
    heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),

    /** Success — wallet connect, game created, transaction confirmed */
    success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),

    /** Error — failed transaction, invalid action */
    error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),

    /** Warning — low balance, game ending soon */
    warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),

    /** Selection — picker change, option toggle */
    selection: () => Haptics.selectionAsync(),
} as const;
