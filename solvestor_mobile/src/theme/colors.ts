// ============================================================
// Theme Colors — Solvestor Mobile (Light Mode)
// ============================================================
// Matches the web app's light aesthetic with Solana branding.
// ============================================================

export const COLORS = {
    // Brand
    solanaPurple: '#9945FF',
    solanaGreen: '#14F195',

    // Semantic
    gain: '#14F195',
    loss: '#FF4D6A',
    warning: '#FFB84D',

    // Light mode surfaces
    bgPrimary: '#f8f8fc',
    bgSecondary: '#f0f0f5',
    bgTertiary: '#e8e8f0',
    surface: '#ffffff',
    surfaceElevated: '#ffffff',
    border: 'rgba(0, 0, 0, 0.08)',
    borderSubtle: 'rgba(0, 0, 0, 0.04)',

    // Text
    textPrimary: '#1a1a2e',
    textSecondary: '#6b6b80',
    textMuted: '#a0a0b0',

    // Tile category color bands
    tileTier1: '#FF6B6B',
    tileTier2: '#4ECDC4',
    tileTier3: '#FFE66D',
    tileTier4: '#A8E6CF',
    tileUtility: '#7B68EE',
    tileEvent: '#FF8C42',
    tileTax: '#FF4D6A',
    tileCorner: '#9945FF',
} as const;

export const PLAYER_COLORS = [
    '#9945FF',  // Purple (Player 1)
    '#14F195',  // Green  (Player 2)
    '#FF6B6B',  // Red    (Player 3)
    '#4ECDC4',  // Teal   (Player 4)
] as const;

export const GRADIENTS = {
    /** Main brand gradient — purple → green */
    brand: ['#9945FF', '#7B3FE4', '#14F195'] as const,
    /** Light surface gradient */
    lightSurface: ['#f8f8fc', '#f0f0f5', '#e8e8f0'] as const,
    /** Card glass gradient */
    glass: ['rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.6)'] as const,
} as const;
