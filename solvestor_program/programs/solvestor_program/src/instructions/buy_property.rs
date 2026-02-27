use anchor_lang::prelude::*;
use session_keys::{session_auth_or, Session, SessionError, SessionToken};

use crate::state::{GameState, PlayerState, PLAYER_SEED};
use crate::constants::get_tile_config;
use crate::errors::GameErrorCode;

#[derive(Accounts, Session)]
pub struct BuyProperty<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub game: Box<Account<'info, GameState>>,

    #[account(
        mut,
        seeds = [PLAYER_SEED, game.key().as_ref(), player.user.as_ref()],
        bump = player.bump
    )]
    pub player: Account<'info, PlayerState>,

    #[session(
        signer = payer,
        authority = player.authority.key()
    )]
    pub session_token: Option<Account<'info, SessionToken>>,
}

#[session_auth_or(
    ctx.accounts.player.authority.key() == ctx.accounts.payer.key(),
    SessionError::InvalidToken
)]
pub fn buy_property(ctx: Context<BuyProperty>, tile_index: u8) -> Result<()> {
    let game = &mut ctx.accounts.game;
    let player = &mut ctx.accounts.player;

    require!(game.is_started, GameErrorCode::GameNotStarted);
    require!(!game.is_ended, GameErrorCode::GameEnded);
    require!(player.is_active, GameErrorCode::PlayerNotActive);
    require!(tile_index < 40, GameErrorCode::InvalidTileIndex);
    require!(player.current_position == tile_index, GameErrorCode::NotOnTile);

    let tile_config = get_tile_config(tile_index);
    let idx = tile_index as usize;

    require!(tile_config.is_ownable, GameErrorCode::NotOwnable);
    require!(
        game.property_owners[idx] == Pubkey::default(),
        GameErrorCode::PropertyAlreadyOwned
    );
    require!(
        player.balance >= tile_config.buy_price,
        GameErrorCode::InsufficientBalance
    );

    // Deduct price and assign ownership
    player.balance = player.balance.saturating_sub(tile_config.buy_price);
    game.property_owners[idx] = player.user;

    msg!(
        "Player {} bought tile {} for {}",
        player.user,
        tile_index,
        tile_config.buy_price
    );

    Ok(())
}
