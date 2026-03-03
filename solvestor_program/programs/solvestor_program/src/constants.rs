use anchor_lang::prelude::*;

// ─── Game Constants ──────────────────────────────────────────
pub const GO_BONUS: u64 = 200;
pub const ROLL_COOLDOWN: i64 = 10; // seconds
pub const MIN_GO_COUNT_TO_END: u16 = 20;
pub const MIN_GO_PASSES_FOR_WINNER: u16 = 15;
pub const TAX_AMOUNT: u64 = 200;
pub const DEFI_STAKE_COST: u64 = 200;
pub const DEFI_LANDING_YIELD: u64 = 25;
pub const DEFI_LANDING_FEE: u64 = 20; // fee if NOT staked
pub const SHIELD_COST: u64 = 200;
pub const MEV_PENALTY_BPS: u64 = 1000;    // 10% in basis points
pub const HOUSE_FEE_BPS: u64 = 500;       // 5% in basis points
pub const POTION_COST: u64 = 500;         // BioDAO resurrection potion
pub const GRAVEYARD_PENALTY_BPS: u64 = 4000; // 40% penalty when trapped
pub const SCHOOL_BONUS: u64 = 50;         // landing on Turbine/Blueshift
pub const GOVERNANCE_BONUS: u64 = 25;     // voting reward

// ─── Enums ───────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum TileType {
    Corner,
    Ownable,
    DeFi,
    Event,
    Risk,
    Tax,
    Neutral,
    Privacy,
    Governance,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum CornerType {
    Go,
    Graveyard,
    Grant,
    Liquidation,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum RentFormula {
    Flat,
    OwnedCountMultiplier,
    None,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum ColorGroup {
    Brown,
    LightBlue,
    Orange,
    Red,
    Yellow,
    Green,
    DarkBlue,
    Purple,
    Grey,
    None,
}

// ─── Tile Config ─────────────────────────────────────────────

#[derive(Clone, Copy, Debug)]
pub struct TileConfig {
    pub tile_type: TileType,
    pub color_group: ColorGroup,
    pub is_ownable: bool,
    pub buy_price: u64,
    pub base_fee: u64,
    pub rent_formula: RentFormula,
    pub rent_value: u64,
    pub corner_type: Option<CornerType>,
    pub penalty_value: u64,
    pub penalty_is_percentage: bool,
    pub reward_value: u64,
    pub reward_is_random: bool,
}

impl TileConfig {
    const fn ownable(
        color_group: ColorGroup,
        buy_price: u64,
        base_fee: u64,
        rent_formula: RentFormula,
        rent_value: u64,
    ) -> Self {
        Self {
            tile_type: TileType::Ownable,
            color_group,
            is_ownable: true,
            buy_price,
            base_fee,
            rent_formula,
            rent_value,
            corner_type: None,
            penalty_value: 0,
            penalty_is_percentage: false,
            reward_value: 0,
            reward_is_random: false,
        }
    }

    const fn corner(corner_type: CornerType) -> Self {
        Self {
            tile_type: TileType::Corner,
            color_group: ColorGroup::None,
            is_ownable: false,
            buy_price: 0,
            base_fee: 0,
            rent_formula: RentFormula::None,
            rent_value: 0,
            corner_type: Some(corner_type),
            penalty_value: 0,
            penalty_is_percentage: false,
            reward_value: 0,
            reward_is_random: false,
        }
    }

    const fn event_random() -> Self {
        Self {
            tile_type: TileType::Event,
            color_group: ColorGroup::None,
            is_ownable: false,
            buy_price: 0,
            base_fee: 0,
            rent_formula: RentFormula::None,
            rent_value: 0,
            corner_type: None,
            penalty_value: 0,
            penalty_is_percentage: false,
            reward_value: 0,
            reward_is_random: true,
        }
    }

    const fn event_flat(reward_value: u64) -> Self {
        Self {
            tile_type: TileType::Event,
            color_group: ColorGroup::None,
            is_ownable: false,
            buy_price: 0,
            base_fee: 0,
            rent_formula: RentFormula::None,
            rent_value: 0,
            corner_type: None,
            penalty_value: 0,
            penalty_is_percentage: false,
            reward_value,
            reward_is_random: false,
        }
    }

    const fn defi() -> Self {
        Self {
            tile_type: TileType::DeFi,
            color_group: ColorGroup::Purple,
            is_ownable: false,
            buy_price: 0,
            base_fee: 0,
            rent_formula: RentFormula::None,
            rent_value: 0,
            corner_type: None,
            penalty_value: 0,
            penalty_is_percentage: false,
            reward_value: 0,
            reward_is_random: false,
        }
    }

    const fn risk(penalty_is_percentage: bool, penalty_value: u64) -> Self {
        Self {
            tile_type: TileType::Risk,
            color_group: ColorGroup::Grey,
            is_ownable: false,
            buy_price: 0,
            base_fee: 0,
            rent_formula: RentFormula::None,
            rent_value: 0,
            corner_type: None,
            penalty_value,
            penalty_is_percentage,
            reward_value: 0,
            reward_is_random: false,
        }
    }

    const fn tax() -> Self {
        Self {
            tile_type: TileType::Tax,
            color_group: ColorGroup::None,
            is_ownable: false,
            buy_price: 0,
            base_fee: 0,
            rent_formula: RentFormula::None,
            rent_value: 0,
            corner_type: None,
            penalty_value: TAX_AMOUNT,
            penalty_is_percentage: false,
            reward_value: 0,
            reward_is_random: false,
        }
    }

    const fn neutral() -> Self {
        Self {
            tile_type: TileType::Neutral,
            color_group: ColorGroup::Grey,
            is_ownable: false,
            buy_price: 0,
            base_fee: 0,
            rent_formula: RentFormula::None,
            rent_value: 0,
            corner_type: None,
            penalty_value: 0,
            penalty_is_percentage: false,
            reward_value: 0,
            reward_is_random: false,
        }
    }

    const fn privacy() -> Self {
        Self {
            tile_type: TileType::Privacy,
            color_group: ColorGroup::Purple,
            is_ownable: false,
            buy_price: 0,
            base_fee: 0,
            rent_formula: RentFormula::None,
            rent_value: 0,
            corner_type: None,
            penalty_value: 0,
            penalty_is_percentage: false,
            reward_value: 0,
            reward_is_random: false,
        }
    }

    const fn governance() -> Self {
        Self {
            tile_type: TileType::Governance,
            color_group: ColorGroup::Grey,
            is_ownable: false,
            buy_price: 0,
            base_fee: 0,
            rent_formula: RentFormula::None,
            rent_value: 0,
            corner_type: None,
            penalty_value: 0,
            penalty_is_percentage: false,
            reward_value: 0,
            reward_is_random: false,
        }
    }
}

// ─── Tile Lookup ─────────────────────────────────────────────
// Matches boardTiles.ts exactly (all 40 tiles, index 0-39)

pub fn get_tile_config(index: u8) -> TileConfig {
    match index {
        // ── Bottom Row (0-9) ──
        0  => TileConfig::corner(CornerType::Go),                                                        // Send It (GO)
        1  => TileConfig::ownable(ColorGroup::Brown, 60, 10, RentFormula::Flat, 20),                     // Solflare
        2  => TileConfig::event_random(),                                                                 // Community Chest
        3  => TileConfig::ownable(ColorGroup::Brown, 60, 10, RentFormula::Flat, 20),                     // Phantom
        4  => TileConfig::tax(),                                                                           // USDC Tax
        5  => TileConfig::ownable(ColorGroup::Green, 300, 25, RentFormula::OwnedCountMultiplier, 25),    // Helius (RPC)
        6  => TileConfig::defi(),                                                                          // Jupiter
        7  => TileConfig::event_random(),                                                                 // Magic Card (Chance)
        8  => TileConfig::defi(),                                                                          // Kamino
        9  => TileConfig::ownable(ColorGroup::Yellow, 150, 10, RentFormula::OwnedCountMultiplier, 10),   // Solana Seeker (Utility)

        // ── Left Side (10-19) ──
        10 => TileConfig::corner(CornerType::Graveyard),                                                  // Graveyard
        11 => TileConfig::ownable(ColorGroup::Orange, 500, 50, RentFormula::Flat, 75),                   // Mad Lads (NFT)
        12 => TileConfig::privacy(),                                                                       // Arcium (Shield)
        13 => TileConfig::ownable(ColorGroup::Orange, 550, 60, RentFormula::Flat, 80),                   // Tensor (NFT)
        14 => TileConfig::defi(),                                                                          // Drift Protocol
        15 => TileConfig::ownable(ColorGroup::Green, 300, 25, RentFormula::OwnedCountMultiplier, 25),    // Triton One (RPC)
        16 => TileConfig::ownable(ColorGroup::Orange, 600, 70, RentFormula::Flat, 100),                  // Magic Eden (NFT)
        17 => TileConfig::event_random(),                                                                 // Magic Chest
        18 => TileConfig::ownable(ColorGroup::Orange, 650, 80, RentFormula::Flat, 110),                  // Exchange Art (NFT)
        19 => TileConfig::defi(),                                                                          // Marinade

        // ── Top Row (20-29) ──
        20 => TileConfig::corner(CornerType::Grant),                                                      // Grant
        21 => TileConfig::ownable(ColorGroup::LightBlue, 200, 30, RentFormula::Flat, 50),                // Backpack (Wallet)
        22 => TileConfig::risk(true, MEV_PENALTY_BPS),                                                    // MEV Bot (10%)
        23 => TileConfig::ownable(ColorGroup::LightBlue, 220, 35, RentFormula::Flat, 55),                // Ledger (Wallet)
        24 => TileConfig::governance(),                                                                    // Governance
        25 => TileConfig::ownable(ColorGroup::Green, 300, 25, RentFormula::OwnedCountMultiplier, 25),    // QuickNode (RPC)
        26 => TileConfig::defi(),                                                                          // Meteora
        27 => TileConfig::event_random(),                                                                 // Magic Card (Chance)
        28 => TileConfig::ownable(ColorGroup::Yellow, 150, 10, RentFormula::OwnedCountMultiplier, 10),   // Play Solana (Utility)
        29 => TileConfig::ownable(ColorGroup::LightBlue, 800, 100, RentFormula::Flat, 150),              // Validator Node A

        // ── Right Side (30-39) ──
        30 => TileConfig::corner(CornerType::Liquidation),                                                // Liquidation
        31 => TileConfig::ownable(ColorGroup::Red, 850, 110, RentFormula::Flat, 160),                    // Validator Node B
        32 => TileConfig::event_random(),                                                                 // pump.fun (Meme)
        33 => TileConfig::event_random(),                                                                 // Magic Chest
        34 => TileConfig::event_flat(500),                                                                 // Solana Conf
        35 => TileConfig::ownable(ColorGroup::Green, 300, 25, RentFormula::OwnedCountMultiplier, 25),    // Alchemy (RPC)
        36 => TileConfig::risk(true, MEV_PENALTY_BPS),                                                    // MEV Sandwich (10%)
        37 => TileConfig::neutral(),                                                                       // Blueshift (School)
        38 => TileConfig::neutral(),                                                                       // Solana Turbine (School)
        39 => TileConfig::ownable(ColorGroup::DarkBlue, 1000, 150, RentFormula::Flat, 200),              // DeSci / BioDAO (also potion shop)

        _  => TileConfig::neutral(),
    }
}

// ─── Rent Calculation Helper ─────────────────────────────────

/// Calculate rent for an ownable tile given the game state and owner pubkey
pub fn calculate_rent(game_property_owners: &[Pubkey; 40], game_upgrade_levels: &[u8; 40], tile_index: u8, owner: &Pubkey) -> u64 {
    let tile_config = get_tile_config(tile_index);
    let idx = tile_index as usize;

    let mut rent_amount = match tile_config.rent_formula {
        RentFormula::Flat => tile_config.rent_value,
        RentFormula::OwnedCountMultiplier => {
            let target_group = tile_config.color_group;
            let mut count: u64 = 0;
            for i in 0..40usize {
                if game_property_owners[i] == *owner {
                    let cfg = get_tile_config(i as u8);
                    if cfg.color_group == target_group {
                        count += 1;
                    }
                }
            }
            tile_config.base_fee.saturating_mul(count)
        }
        RentFormula::None => 0,
    };

    // Upgrade multiplier: each level adds 50% to rent
    let upgrade_level = game_upgrade_levels[idx] as u64;
    if upgrade_level > 0 {
        let bonus = rent_amount.saturating_mul(upgrade_level) / 2;
        rent_amount = rent_amount.saturating_add(bonus);
    }

    rent_amount
}
