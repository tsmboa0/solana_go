// ============================================================
// Game Domain Types — Solvestor (SWS)
// ============================================================
// These types define the core data shapes for the game.
// They are SHARED across state, rendering, and UI layers.
// ============================================================

import type { Vector3Tuple } from 'three';

/** Visual/behavioral category of a board tile (Legacy) */
export type TileCategory = 'property' | 'utility' | 'event' | 'tax' | 'corner';

/** Sub-categories for property tiles (affects rent scaling, visuals) (Legacy) */
export type PropertyTier = 'tier1' | 'tier2' | 'tier3' | 'tier4';

/** Static definition of a single board tile (immutable config) (Legacy) */
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

// ============================================================
// NEW TILE CONFIGURATION SCHEMA V2
// ============================================================

export type TileType =
    | "corner"
    | "defi"
    | "rpc"
    | "utility"
    | "nft"
    | "wallet"
    | "validator"
    | "privacy"
    | "risk"
    | "event"
    | "desci"
    | "stablecoin"
    | "governance"
    | "chance"
    | "chest"
    | "neutral"
    | "meme";

export type ColorGroup =
    | "brown"
    | "light_blue"
    | "orange"
    | "red"
    | "yellow"
    | "green"
    | "dark_blue"
    | "purple"
    | "grey";

export interface OwnableFunction {
    action_type: "ownable";
    buy_price: number;
    base_fee: number; // landing fee
    rent_formula: "flat" | "owned_count_multiplier" | "percentage_balance";
    rent_value: number;
    upgrade_cost?: number;
}

export interface DeFiFunction {
    action_type: "defi";
    landing_fee: number;
    can_stake: boolean;
    can_borrow: boolean;
    can_provide_liquidity: boolean;
    can_swap: boolean;
    epoch_yield_rate?: number;
    borrow_interest_rate?: number;
    liquidation_threshold?: number;
}

export interface GovernanceFunction {
    action_type: "governance";
    quorum_percentage: number;
    possible_proposals: string[];
    effect_duration_epochs: number;
}

export interface RiskFunction {
    action_type: "risk";
    penalty_type: "flat" | "percentage";
    penalty_value: number;
    can_be_protected: boolean;
    protection_source?: string;
}

export interface PrivacyFunction {
    action_type: "privacy";
    shield_cost: number;
    shield_duration_epochs: number;
}

export interface EventFunction {
    action_type: "event";
    reward_type: "flat" | "percentage" | "random";
    reward_value: number;
}

export interface NeutralFunction {
    action_type: "neutral";
}

export interface CornerFunction {
    action_type: "corner";
    corner_type: "go" | "graveyard" | "liquidation" | "grant";
}

export type TileFunction =
    | OwnableFunction
    | DeFiFunction
    | GovernanceFunction
    | RiskFunction
    | PrivacyFunction
    | EventFunction
    | NeutralFunction
    | CornerFunction;

export interface TileActionConfig {
    id: string;
    label: string;
    action_type: string;
    requires_input: boolean;
    is_primary: boolean;
    visibility_condition: string;
}

export interface Tile {
    tile_index: number;
    project_name: string;
    description: string; // real-world description
    game_description: string; // what it does in game
    type: TileType;
    color_group: ColorGroup | null;
    is_ownable: boolean;
    is_upgradable: boolean;
    is_gain: boolean; // does landing generate positive gain?
    owner: string | "Not ownable";
    image_url: string;
    tile_function: TileFunction;
    available_actions: TileActionConfig[];
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
}
