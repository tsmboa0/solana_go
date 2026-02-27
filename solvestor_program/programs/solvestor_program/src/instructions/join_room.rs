use anchor_lang::prelude::*;
use crate::state::{GameState, PlayerState, PLAYER_SEED};
use crate::errors::GameErrorCode;

#[derive(Accounts)]
pub struct JoinRoom<'info> {
    #[account(
        mut,
        constraint = game.is_started == false @ GameErrorCode::GameAlreadyStarted,
        constraint = game.is_ended == false @ GameErrorCode::GameEnded,
        constraint = game.player_count < game.max_players @ GameErrorCode::RoomFull,
    )]
    pub game: Box<Account<'info, GameState>>,

    #[account(
        init,
        payer = user,
        space = PlayerState::SPACE,
        seeds = [PLAYER_SEED, game.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub player: Account<'info, PlayerState>,

    /// CHECK: Native SOL Escrow PDA matching GameState escrow
    #[account(
        mut,
        address = game.escrow_pda @ GameErrorCode::InvalidEscrow
    )]
    pub escrow: SystemAccount<'info>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn join_room(ctx: Context<JoinRoom>) -> Result<()> {
    let game = &mut ctx.accounts.game;


    // Verify player hasn't already joined
    for p in game.players.iter() {
        require!(*p != ctx.accounts.user.key(), GameErrorCode::PlayerAlreadyJoined);
    }

    let index = game.player_count as usize;
    game.players[index] = ctx.accounts.user.key();
    game.player_count += 1;

    // Auto-start if max players reached
    if game.player_count == game.max_players {
        game.is_started = true;
        msg!("All {} players joined — game auto-started!", game.max_players);
    }

    // Initialize player state
    let player = &mut ctx.accounts.player;
    player.user = ctx.accounts.user.key();
    player.game = game.key();
    player.player_index = index as u8;
    player.balance = game.start_capital;
    player.current_position = 0;
    player.last_roll_timestamp = 0;
    player.last_dice_result = [0, 0];
    player.go_passes = 0;
    player.is_active = true;
    player.has_shield = false;
    player.has_staked_defi = false;
    player.has_potion = false;
    player.is_in_graveyard = false;
    player.authority = ctx.accounts.user.key();
    player.bump = ctx.bumps.player;

    // Transfer stake from user to escrow
    let stake = game.stake_amount;
    anchor_lang::system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: ctx.accounts.escrow.to_account_info(),
            },
        ),
        stake,
    )?;

    msg!(
        "Player {} joined as player #{} (count: {})",
        ctx.accounts.user.key(),
        index,
        game.player_count
    );
    Ok(())
}
