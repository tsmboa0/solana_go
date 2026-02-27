use anchor_lang::prelude::*;
use session_keys::{session_auth_or, Session, SessionError, SessionToken};

use crate::state::{GameState, PlayerState, PLAYER_SEED};
use crate::constants::{get_tile_config, RentFormula};
use crate::errors::GameErrorCode;

#[derive(Accounts, Session)]
pub struct PayRent<'info> {
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

    #[account(
        mut,
        seeds = [PLAYER_SEED, game.key().as_ref(), owner_player.user.as_ref()],
        bump = owner_player.bump
    )]
    pub owner_player: Account<'info, PlayerState>,

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
pub fn pay_rent(ctx: Context<PayRent>, tile_index: u8) -> Result<()> {
    let game = &mut ctx.accounts.game;
    let player = &mut ctx.accounts.player;
    let owner_player = &mut ctx.accounts.owner_player;

    require!(game.is_started, GameErrorCode::GameNotStarted);
    require!(!game.is_ended, GameErrorCode::GameEnded);
    require!(player.is_active, GameErrorCode::PlayerNotActive);
    require!(tile_index < 40, GameErrorCode::InvalidTileIndex);
    require!(player.current_position == tile_index, GameErrorCode::NotOnTile);

    let idx = tile_index as usize;
    let tile_config = get_tile_config(tile_index);

    // Verify the property is owned
    let owner_pubkey = game.property_owners[idx];
    require!(owner_pubkey != Pubkey::default(), GameErrorCode::NotOwner);

    // Verify the owner_player account matches the property owner
    require!(owner_pubkey == owner_player.user, GameErrorCode::NotOwner);

    // Can't pay rent to yourself
    require!(owner_pubkey != player.user, GameErrorCode::NotOwner);

    // Compute rent amount based on formula
    let mut rent_amount = match tile_config.rent_formula {
        RentFormula::Flat => tile_config.rent_value,
        RentFormula::OwnedCountMultiplier => {
            // Count how many tiles in the same color group the owner possesses
            let target_group = tile_config.color_group;
            let mut count: u64 = 0;
            for i in 0..40usize {
                if game.property_owners[i] == owner_pubkey {
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

    // Apply upgrade multiplier: each upgrade level adds 50% to rent
    let upgrade_level = game.property_upgrade_levels[idx] as u64;
    if upgrade_level > 0 {
        // rent * (1 + 0.5 * level) = rent + rent * level / 2
        let bonus = rent_amount.saturating_mul(upgrade_level) / 2;
        rent_amount = rent_amount.saturating_add(bonus);
    }

    // Handle bankruptcy: pay whatever the player has
    if player.balance < rent_amount {
        rent_amount = player.balance;
    }

    player.balance = player.balance.saturating_sub(rent_amount);
    owner_player.balance = owner_player.balance.saturating_add(rent_amount);

    msg!(
        "Player {} paid {} rent to {} for tile {}",
        player.user,
        rent_amount,
        owner_player.user,
        tile_index
    );

    Ok(())
}
