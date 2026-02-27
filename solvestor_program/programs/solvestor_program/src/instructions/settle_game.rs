use anchor_lang::prelude::*;

use crate::state::{GameState, GAME_SEED, ESCROW_SEED};
use crate::constants::HOUSE_FEE_BPS;
use crate::errors::GameErrorCode;

/// SettleGame runs on L1 (mainchain) AFTER end_game has undelegated the GameState.
/// It transfers the escrow funds: 95% to the winner, 5% to the house authority.
/// This must happen on L1 because the escrow PDA lives on mainchain.
#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct SettleGame<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [GAME_SEED, game.creator.key().as_ref(), game_id.to_le_bytes().as_ref()],
        bump = game.bump,
        constraint = game.is_ended @ GameErrorCode::GameNotEnded,
        constraint = game.winner.is_some() @ GameErrorCode::WinnerNotDetermined,
    )]
    pub game: Box<Account<'info, GameState>>,

    /// CHECK: Escrow PDA holding the staked SOL
    #[account(
        mut,
        seeds = [ESCROW_SEED, game.key().as_ref()],
        bump
    )]
    pub escrow: SystemAccount<'info>,

    /// CHECK: The winner's wallet — must match game.winner
    #[account(
        mut,
        address = game.winner.unwrap() @ GameErrorCode::Unauthorized
    )]
    pub winner: SystemAccount<'info>,

    /// CHECK: The house authority — receives 5% fee
    #[account(
        mut,
        address = game.authority @ GameErrorCode::Unauthorized
    )]
    pub house_account: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn settle_game(ctx: Context<SettleGame>, _game_id: u64) -> Result<()> {
    let escrow_balance = ctx.accounts.escrow.lamports();

    if escrow_balance == 0 {
        msg!("Escrow is empty — nothing to settle");
        return Ok(());
    }

    // Calculate house fee (5%) and winner payout (95%)
    let house_fee = escrow_balance
        .checked_mul(HOUSE_FEE_BPS).unwrap_or(0) / 10_000;
    let winner_payout = escrow_balance.saturating_sub(house_fee);

    // Transfer from escrow PDA using lamport manipulation
    // (The program owns the escrow PDA via seeds, so we can adjust lamports directly)

    // Pay the winner
    if winner_payout > 0 {
        ctx.accounts.escrow.sub_lamports(winner_payout)?;
        ctx.accounts.winner.add_lamports(winner_payout)?;
    }

    // Pay the house
    if house_fee > 0 {
        ctx.accounts.escrow.sub_lamports(house_fee)?;
        ctx.accounts.house_account.add_lamports(house_fee)?;
    }

    msg!(
        "Settlement complete! Winner {} received {} lamports, house fee {} lamports",
        ctx.accounts.winner.key(),
        winner_payout,
        house_fee
    );

    Ok(())
}
