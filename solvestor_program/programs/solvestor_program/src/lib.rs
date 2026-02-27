use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

use ephemeral_rollups_sdk::anchor::ephemeral;

declare_id!("HqicBmtY4WMbEVq2ZeLuWCUUr6VTTmfkJ6RGjFn3GLBo");

#[ephemeral]
#[program]
pub mod solvestor_program {
    use super::*;

    // ── Room Management ──────────────────────────────────

    pub fn create_room(
        ctx: Context<CreateRoom>,
        game_id: u64,
        round_duration: i64,
        start_capital: u64,
        stake_amount: u64,
        max_players: u8,
    ) -> Result<()> {
        instructions::create_room::create_room(ctx, game_id, round_duration, start_capital, stake_amount, max_players)
    }

    pub fn start_game(ctx: Context<StartGame>, game_id: u64) -> Result<()> {
        instructions::start_game::start_game(ctx, game_id)
    }

    pub fn join_room(ctx: Context<JoinRoom>) -> Result<()> {
        instructions::join_room::join_room(ctx)
    }

    // ── Delegation (MagicBlock ER) ───────────────────────

    pub fn delegate_game(ctx: Context<DelegateGame>, game_id: u64) -> Result<()> {
        instructions::delegate::delegate_game(ctx, game_id)
    }

    pub fn delegate_player(ctx: Context<DelegatePlayer>) -> Result<()> {
        instructions::delegate::delegate_player(ctx)
    }

    // ── Gameplay (VRF + Session Keys, inside ER) ─────────

    pub fn roll_dice(ctx: Context<RollDice>, client_seed: u8) -> Result<()> {
        instructions::roll_dice::roll_dice(ctx, client_seed)
    }

    pub fn callback_roll_dice(ctx: Context<CallbackRollDice>, randomness: [u8; 32]) -> Result<()> {
        instructions::roll_dice::callback_roll_dice(ctx, randomness)
    }

    pub fn buy_property(ctx: Context<BuyProperty>, tile_index: u8) -> Result<()> {
        instructions::buy_property::buy_property(ctx, tile_index)
    }

    pub fn pay_rent(ctx: Context<PayRent>, tile_index: u8) -> Result<()> {
        instructions::pay_rent::pay_rent(ctx, tile_index)
    }

    pub fn perform_tile_action(ctx: Context<PerformTileAction>, tile_index: u8, choose_action: bool) -> Result<()> {
        instructions::perform_tile_action::perform_tile_action(ctx, tile_index, choose_action)
    }

    // ── Exit / End / Settlement ──────────────────────────

    pub fn leave_room(ctx: Context<LeaveRoom>) -> Result<()> {
        instructions::leave_room::leave_room(ctx)
    }

    /// Runs inside ER — computes winner, commits + undelegates GameState to L1
    pub fn end_game(ctx: Context<EndGame>, game_id: u64) -> Result<()> {
        instructions::end_game::end_game(ctx, game_id)
    }

    /// Runs on L1 — transfers escrow funds (95% winner, 5% house fee)
    pub fn settle_game(ctx: Context<SettleGame>, game_id: u64) -> Result<()> {
        instructions::settle_game::settle_game(ctx, game_id)
    }
}
