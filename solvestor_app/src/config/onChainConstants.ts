// ============================================================
// On-Chain Constants Mirror — Solvestor (SWS)
// ============================================================
// Mirrors the Solana program's constants.rs exactly.
// Used for optimistic UI updates in beginner mode.
// ============================================================

// ─── Game Economy Constants ──────────────────────────────────

/** Bonus for passing or landing on GO */
export const GO_BONUS = 200;

/** Cooldown between dice rolls (seconds) */
export const ROLL_COOLDOWN_SECONDS = 20;

/** Tax tile deduction */
export const TAX_AMOUNT = 200;

/** Cost to stake in DeFi */
export const DEFI_STAKE_COST = 200;

/** Yield earned from landing on DeFi tile when staked */
export const DEFI_LANDING_YIELD = 25;

/** Fee for landing on DeFi tile when NOT staked */
export const DEFI_LANDING_FEE = 20;

/** Cost to buy Arcium privacy shield */
export const SHIELD_COST = 200;

/** MEV risk penalty in basis points (10%) */
export const MEV_PENALTY_BPS = 1000;

/** BioDAO resurrection potion cost */
export const POTION_COST = 500;

/** Graveyard penalty in basis points (40%) */
export const GRAVEYARD_PENALTY_BPS = 4000;

/** School tile bonus (Blueshift/Turbine) */
export const SCHOOL_BONUS = 50;

/** Governance voting reward */
export const GOVERNANCE_BONUS = 25;

// ─── Board Size ──────────────────────────────────────────────

export const BOARD_TILES = 40;

// ─── Special Tile Indices ────────────────────────────────────

export const TILE_GO = 0;
export const TILE_GRAVEYARD = 10;
export const TILE_GRANT = 20;
export const TILE_LIQUIDATION = 30;
export const TILE_ARCIUM = 12;  // Privacy shield
export const TILE_DESCI = 39;   // BioDAO potion shop

/** Community Chest tile indices */
export const CHEST_TILES = [2, 17, 33];

/** Chance tile indices */
export const CHANCE_TILES = [7, 27];

/** DeFi tile indices */
export const DEFI_TILES = [6, 8, 14, 19, 26];

/** pump.fun (Meme) tile */
export const TILE_PUMP_FUN = 32;

/** Solana Conf (flat reward) tile */
export const TILE_SOLANA_CONF = 34;

/** School tiles */
export const SCHOOL_TILES = [37, 38];

/** RPC tiles (for chance "Network Upgrade" card) */
export const RPC_TILES = [5, 15, 25, 35];

/** System (default) pubkey — indicates unowned property */
export const DEFAULT_PUBKEY = '11111111111111111111111111111111';
