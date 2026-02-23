// ============================================================
// Game Domain Types — Solvestor (SWS)
// ============================================================
// These types define the core data shapes for the game.
// They are SHARED across state, rendering, and UI layers.
// ============================================================

import type { Vector3Tuple } from 'three';

/** Visual/behavioral category of a board tile */
export type TileCategory = 'property' | 'utility' | 'event' | 'tax' | 'corner';

/** Sub-categories for property tiles (affects rent scaling, visuals) */
export type PropertyTier = 'tier1' | 'tier2' | 'tier3' | 'tier4';

/** Static definition of a single board tile (immutable config) */
export interface TileDefinition {
    /** Unique index (0–39), also determines board position */
    id: number;
    /** Display name shown on tile */
    name: string;
    /** Tile category — drives behavior and styling */
    category: TileCategory;
    /** Purchase price (only for property/utility) */
    price: number | null;
    /** Base rent (only for property/utility) */
    rent: number | null;
    /** Color band hex — category/tier identifier */
    colorBand: string;
    /** Short description for bottom sheet */
    description: string;
    /** Emoji/icon identifier (mapped to actual icons later) */
    icon: string;
    /** Property tier (only for property tiles) */
    tier?: PropertyTier;
}

/** Runtime state of a player */
export interface Player {
    id: string;
    name: string;
    /** Player color hex — used for token, glow, UI accents */
    color: string;
    /** Current tile index (0–39) */
    position: number;
    /** Cash balance in dollars */
    balance: number;
    /** Array of tile IDs owned by this player */
    ownedTiles: number[];
    /** Whether it's this player's turn */
    isActive: boolean;
}

/** Phases of a single turn */
export type GamePhase =
    | 'waiting'     // Waiting for dice roll
    | 'rolling'     // Dice animation playing
    | 'moving'      // Token animating tile-by-tile
    | 'landed'      // Token landed, camera zooming in
    | 'action'      // Action popup visible (buy/rent/event)
    | 'turnEnd';    // Turn complete, switching players

/** Result of a dice roll */
export interface DiceResult {
    die1: number;
    die2: number;
    total: number;
    isDoubles: boolean;
}

/** Action that a tile triggers when landed on */
export type TileAction =
    | { type: 'buy'; tileId: number; price: number }
    | { type: 'pay_rent'; tileId: number; amount: number; ownerId: string }
    | { type: 'draw_event'; tileId: number }
    | { type: 'pay_tax'; tileId: number; amount: number }
    | { type: 'corner'; tileId: number; cornerType: 'go' | 'staking' | 'governance' | 'liquidation' }
    | { type: 'none' };

/** Computed tile layout position for 3D board rendering */
export interface TileLayout {
    position: Vector3Tuple;
    rotation: number; // Y-axis rotation in radians
    isCorner: boolean;
    /** 1 = default header at -Z edge, -1 = flip header to +Z edge (keeps headers facing board center) */
    contentFlip: 1 | -1;
}
