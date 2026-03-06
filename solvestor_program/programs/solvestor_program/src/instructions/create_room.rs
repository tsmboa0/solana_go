use anchor_lang::prelude::*;
use crate::state::{GameState, PlayerState, GAME_SEED, PLAYER_SEED, ESCROW_SEED};
use crate::errors::GameErrorCode;

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct CreateRoom<'info> {
    #[account(
        init,
        payer = creator,
        space = GameState::SPACE,
        seeds = [GAME_SEED, creator.key().as_ref(), game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub game: Box<Account<'info, GameState>>,

    #[account(
        init,
        payer = creator,
        space = PlayerState::SPACE,
        seeds = [PLAYER_SEED, game.key().as_ref(), creator.key().as_ref()],
        bump
    )]
    pub player: Account<'info, PlayerState>,

    /// CHECK: Native SOL Escrow PDA — receives lamports via transfer
    #[account(
        mut,
        seeds = [ESCROW_SEED, game.key().as_ref()],
        bump
    )]
    pub escrow: SystemAccount<'info>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn create_room(
    ctx: Context<CreateRoom>,
    game_id: u64,
    round_duration: i64,
    start_capital: u64,
    stake_amount: u64,
    max_players: u8,
    max_go_count: u16,
) -> Result<()> {
    require!(max_players >= 2 && max_players <= 10, GameErrorCode::InvalidMaxPlayers);

    let clock = Clock::get()?;
    let game = &mut ctx.accounts.game;

    // Initialize game state
    game.game_id = game_id;
    game.creator = ctx.accounts.creator.key();
    game.bump = ctx.bumps.game;
    game.round_duration = round_duration;
    game.start_capital = start_capital;
    game.stake_amount = stake_amount;
    game.max_players = max_players;
    game.players = [Pubkey::default(); 10];
    game.players[0] = ctx.accounts.creator.key();
    game.player_count = 1;
    game.property_owners = [Pubkey::default(); 40];
    game.property_upgrade_levels = [0u8; 40];
    game.escrow_pda = ctx.accounts.escrow.key();
    game.authority = ctx.accounts.creator.key();
    game.is_ended = false;
    game.is_started = false;
    game.go_count = 0;
    game.max_go_count = max_go_count;
    game.winner = None;
    game.created_at = clock.unix_timestamp;
    game.escrow_bump = ctx.bumps.escrow;

    // Initialize player state for creator
    let player = &mut ctx.accounts.player;
    player.user = ctx.accounts.creator.key();
    player.game = game.key();
    player.player_index = 0;
    player.balance = start_capital;
    player.current_position = 0;
    player.last_roll_timestamp = 0; // No cooldown on first roll
    player.last_dice_result = [0, 0];
    player.go_passes = 0;
    player.is_active = true;
    player.has_shield = false;
    player.has_staked_defi = false;
    player.has_potion = false;
    player.is_in_graveyard = false;
    player.authority = ctx.accounts.creator.key();
    player.bump = ctx.bumps.player;

    // Transfer stake + rent-exempt minimum to escrow.
    // The rent cushion keeps the escrow PDA alive after settlement.
    // Creator gets the rent back when the escrow is closed later.
    let rent_exempt_min = Rent::get()?.minimum_balance(0);
    anchor_lang::system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.creator.to_account_info(),
                to: ctx.accounts.escrow.to_account_info(),
            },
        ),
        stake_amount + rent_exempt_min,
    )?;

    msg!("Game {} created by {} (escrow funded: {} stake + {} rent)",
        game_id, ctx.accounts.creator.key(), stake_amount, rent_exempt_min);
    Ok(())
}
