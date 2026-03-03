use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::commit;
use ephemeral_rollups_sdk::ephem::commit_and_undelegate_accounts;
use session_keys::{session_auth_or, Session, SessionError, SessionToken};

use crate::state::{GameState, PlayerState, PLAYER_SEED};
use crate::errors::GameErrorCode;

#[commit]
#[derive(Accounts, Session)]
pub struct LeaveRoom<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub game: Box<Account<'info, GameState>>,

    #[account(
        mut,
        seeds = [PLAYER_SEED, game.key().as_ref(), player.user.as_ref()],
        bump = player.bump,
        constraint = player.is_active @ GameErrorCode::PlayerNotActive,
    )]
    pub player: Account<'info, PlayerState>,

    #[session(
        signer = payer,
        authority = player.user.key()
    )]
    pub session_token: Option<Account<'info, SessionToken>>,
}

#[session_auth_or(
    ctx.accounts.player.user == ctx.accounts.payer.key(),
    SessionError::InvalidToken
)]
pub fn leave_room(ctx: Context<LeaveRoom>) -> Result<()> {
    let game = &mut ctx.accounts.game;
    let player = &mut ctx.accounts.player;

    require!(player.is_active, GameErrorCode::PlayerNotActive);

    // Remove player from the game's player array
    let player_key = player.user;
    for i in 0..10 {
        if game.players[i] == player_key {
            game.players[i] = Pubkey::default();
            break;
        }
    }

    // Clear all properties owned by this player
    for i in 0..40 {
        if game.property_owners[i] == player_key {
            game.property_owners[i] = Pubkey::default();
            game.property_upgrade_levels[i] = 0;
        }
    }

    // Update game counters
    game.player_count = game.player_count.saturating_sub(1);

    // Mark player as inactive
    player.is_active = false;
    player.balance = 0; // Forfeit balance (stake stays in escrow for winner)

    // If game hasn't started and all players left, mark as ended
    if !game.is_started && game.player_count == 0 {
        game.is_ended = true;
        msg!("All players left before game started — game cancelled");
    }

    // Serialize before commit+undelegate
    player.exit(&crate::ID)?;

    // Commit and undelegate the player account from the ER
    // Use payer as the signer (works for both session key and direct wallet)
    commit_and_undelegate_accounts(
        &ctx.accounts.payer,
        vec![&ctx.accounts.player.to_account_info()],
        &ctx.accounts.magic_context,
        &ctx.accounts.magic_program,
    )?;

    msg!("Player {} left the room and forfeited their stake", player_key);
    Ok(())
}
