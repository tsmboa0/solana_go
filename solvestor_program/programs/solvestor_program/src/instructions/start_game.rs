use anchor_lang::prelude::*;
use crate::state::{GameState, GAME_SEED};
use crate::errors::GameErrorCode;

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct StartGame<'info> {
    #[account(
        mut,
        seeds = [GAME_SEED, game.creator.key().as_ref(), game_id.to_le_bytes().as_ref()],
        bump = game.bump,
        constraint = game.is_started == false @ GameErrorCode::GameAlreadyStarted,
        constraint = game.is_ended == false @ GameErrorCode::GameEnded,
        constraint = game.creator == creator.key() @ GameErrorCode::NotCreator,
    )]
    pub game: Box<Account<'info, GameState>>,

    pub creator: Signer<'info>,
}

pub fn start_game(ctx: Context<StartGame>, _game_id: u64) -> Result<()> {
    let game = &mut ctx.accounts.game;

    require!(game.player_count >= 2, GameErrorCode::NotEnoughPlayers);

    game.is_started = true;

    msg!(
        "Game {} started by creator with {} players",
        game.game_id,
        game.player_count
    );
    Ok(())
}
