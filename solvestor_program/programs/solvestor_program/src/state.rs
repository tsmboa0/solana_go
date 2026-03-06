use anchor_lang::prelude::*;

pub const GAME_SEED: &[u8] = b"game";
pub const PLAYER_SEED: &[u8] = b"player";
pub const ESCROW_SEED: &[u8] = b"escrow";

#[account]
#[derive(InitSpace)]
pub struct GameState {
    // Identity
    pub game_id: u64,
    pub creator: Pubkey,
    pub bump: u8,

    // Configuration (set at creation, immutable)
    pub round_duration: i64,
    pub start_capital: u64,
    pub stake_amount: u64,
    pub max_players: u8,

    // Player tracking
    pub players: [Pubkey; 10],
    pub player_count: u8,

    // Property ownership — indexed by tile_index (0-39)
    // Pubkey::default() = unowned
    pub property_owners: [Pubkey; 40],
    pub property_upgrade_levels: [u8; 40],

    // Game lifecycle
    pub escrow_pda: Pubkey,
    pub authority: Pubkey,
    pub escrow_bump: u8,
    pub is_ended: bool,
    pub is_started: bool,
    // Tracks the highest go_passes among all active players.
    // Game can end when go_count >= max_go_count.
    pub go_count: u16,
    // Configurable per-game: how many Go passes before the game can end.
    // Set by creator at room creation. Frontend default = 20.
    pub max_go_count: u16,
    pub winner: Option<Pubkey>,
    pub created_at: i64,
}

impl GameState {
    pub const SPACE: usize = 8   // discriminator
        + 8                       // game_id
        + 32                      // creator
        + 1                       // bump
        + 8                       // round_duration
        + 8                       // start_capital
        + 8                       // stake_amount
        + 1                       // max_players
        + (32 * 10)               // players
        + 1                       // player_count
        + (32 * 40)               // property_owners
        + 40                      // property_upgrade_levels
        + 32                      // escrow_pda
        + 32                      // authority
        + 1                       // escrow_bump
        + 1                       // is_ended
        + 1                       // is_started
        + 2                       // go_count
        + 2                       // max_go_count
        + 33                      // winner (Option<Pubkey>)
        + 8;                      // created_at
}

#[account]
#[derive(InitSpace)]
pub struct PlayerState {
    pub user: Pubkey,
    pub game: Pubkey,
    pub player_index: u8,
    pub balance: u64,
    pub current_position: u8,
    pub last_roll_timestamp: i64,
    pub last_dice_result: [u8; 2],
    // Per-player GO pass counter
    pub go_passes: u16,
    pub is_active: bool,
    // Arcium privacy shield (protects against MEV risk tiles)
    pub has_shield: bool,
    // DeFi staking (DEFI_STAKE_COST deducted on stake, +yield on each DeFi landing)
    pub has_staked_defi: bool,
    // BioDAO resurrection potion — survive being sent to graveyard
    pub has_potion: bool,
    // Trapped in graveyard — can only escape by rolling doubles
    pub is_in_graveyard: bool,
    pub authority: Pubkey,
    pub bump: u8,
}

impl PlayerState {
    pub const SPACE: usize = 8   // discriminator
        + 32                      // user
        + 32                      // game
        + 1                       // player_index
        + 8                       // balance
        + 1                       // current_position
        + 8                       // last_roll_timestamp
        + 2                       // last_dice_result
        + 2                       // go_passes
        + 1                       // is_active
        + 1                       // has_shield
        + 1                       // has_staked_defi
        + 1                       // has_potion
        + 1                       // is_in_graveyard
        + 32                      // authority
        + 1;                      // bump
}
