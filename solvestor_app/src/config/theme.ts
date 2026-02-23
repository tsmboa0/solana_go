// ============================================================
// Theme Tokens — Solvestor (SWS)
// ============================================================
// Design tokens for the fintech cyber aesthetic.
// Used by both 3D materials and 2D UI components.
// ============================================================

/** Core palette — Solana-inspired with fintech restraint */
export const COLORS = {
    // Primary brand colors
    solanaPurple: '#9945FF',
    solanaGreen: '#14F195',

    // Semantic colors
    gain: '#14F195',
    loss: '#FF4D6A',
    warning: '#FFB84D',

    // Neutral palette — dark mode base
    bgDark: '#0a0a0f',
    bgDarkSecondary: '#12121a',
    bgDarkTertiary: '#1a1a2e',
    surfaceDark: '#16162a',
    borderDark: 'rgba(255, 255, 255, 0.08)',

    // Neutral palette — light mode base
    bgLight: '#f5f5f7',
    bgLightSecondary: '#eaeaef',
    bgLightTertiary: '#dddde5',
    surfaceLight: '#ffffff',
    borderLight: 'rgba(0, 0, 0, 0.08)',

    // Text
    textPrimary: '#f0f0f5',
    textSecondary: '#8888aa',
    textMuted: '#555570',
    textDark: '#1a1a2e',
    textDarkSecondary: '#555570',

    // Tile category color bands
    tileTier1: '#FF6B6B',    // Red — premium properties
    tileTier2: '#4ECDC4',    // Teal — mid-tier
    tileTier3: '#FFE66D',    // Gold — value properties
    tileTier4: '#A8E6CF',    // Mint — starter properties
    tileUtility: '#7B68EE',  // Medium slate blue
    tileEvent: '#FF8C42',    // Orange — chance/event
    tileTax: '#FF4D6A',      // Red — taxes
    tileCorner: '#9945FF',   // Solana purple — corners
} as const;

/** Player color assignments */
export const PLAYER_COLORS = [
    '#9945FF', // Purple (Player 1)
    '#14F195', // Green  (Player 2)
    '#FF6B6B', // Red    (Player 3, future)
    '#4ECDC4', // Teal   (Player 4, future)
] as const;

/** 3D Material parameters */
export const MATERIALS = {
    board: {
        color: '#0d0d1a',
        roughness: 0.85,
        metalness: 0.1,
    },
    tile: {
        roughness: 0.6,
        metalness: 0.15,
        emissiveIntensity: 0.0,
    },
    tileHover: {
        emissiveIntensity: 0.3,
        elevationOffset: 0.03,
    },
    tileOwned: {
        emissiveIntensity: 0.15,
    },
    token: {
        roughness: 0.3,
        metalness: 0.7,
        emissiveIntensity: 0.2,
    },
} as const;

/** Lighting configuration */
export const LIGHTING = {
    ambient: {
        intensity: 0.35,
        color: '#f0f0ff',
    },
    directional: {
        intensity: 0.8,
        color: '#ffffff',
        position: [5, 10, 5] as [number, number, number],
        castShadow: true,
    },
    accent: {
        intensity: 0.4,
        color: '#9945FF',
        position: [0, -2, 0] as [number, number, number],
    },
} as const;

/** Glassmorphism CSS values */
export const GLASS = {
    background: 'rgba(16, 16, 32, 0.7)',
    backgroundLight: 'rgba(255, 255, 255, 0.7)',
    blur: '20px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderLight: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '16px',
} as const;
