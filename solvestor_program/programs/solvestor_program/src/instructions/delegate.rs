use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::delegate;
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use crate::state::{GameState, PlayerState, GAME_SEED, PLAYER_SEED};

/// Delegate GameState to the Ephemeral Rollup
#[delegate]
#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct DelegateGame<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        del,
        seeds = [GAME_SEED, game.creator.key().as_ref(), game_id.to_le_bytes().as_ref()],
        bump = game.bump
    )]
    pub game: Box<Account<'info, GameState>>,
}

/// Delegate PlayerState to the Ephemeral Rollup
#[delegate]
#[derive(Accounts)]
pub struct DelegatePlayer<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        del,
        seeds = [PLAYER_SEED, player.game.as_ref(), player.user.as_ref()],
        bump = player.bump
    )]
    pub player: Account<'info, PlayerState>,
}

pub fn delegate_game(ctx: Context<DelegateGame>, game_id: u64) -> Result<()> {
    let game = &ctx.accounts.game;
    let creator_key = game.creator.key();
    let game_id_bytes = game_id.to_le_bytes();

    ctx.accounts.delegate_game(
        &ctx.accounts.payer,
        &[GAME_SEED, creator_key.as_ref(), game_id_bytes.as_ref()],
        DelegateConfig {
            validator: ctx.remaining_accounts.first().map(|acc| acc.key()),
            ..Default::default()
        },
    )?;

    msg!("GameState delegated to ER");
    Ok(())
}

pub fn delegate_player(ctx: Context<DelegatePlayer>) -> Result<()> {
    let player = &ctx.accounts.player;
    let game_key = player.game.key();
    let user_key = player.user.key();

    ctx.accounts.delegate_player(
        &ctx.accounts.payer,
        &[PLAYER_SEED, game_key.as_ref(), user_key.as_ref()],
        DelegateConfig {
            validator: ctx.remaining_accounts.first().map(|acc| acc.key()),
            ..Default::default()
        },
    )?;

    msg!("PlayerState delegated to ER");
    Ok(())
}
