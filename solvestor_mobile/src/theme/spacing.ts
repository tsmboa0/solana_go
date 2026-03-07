// ============================================================
// Spacing & Typography — Solvestor Mobile
// ============================================================

/** 4px grid spacing scale */
export const SPACING = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
} as const;

/** Border radius presets */
export const RADIUS = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 999,
} as const;

/** Font families — loaded in _layout.tsx */
export const FONTS = {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    extrabold: 'Inter_800ExtraBold',
    black: 'Inter_900Black',
} as const;

/** Font size scale */
export const FONT_SIZES = {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    title: 42,
    hero: 56,
} as const;
