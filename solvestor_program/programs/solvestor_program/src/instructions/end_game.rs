use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::commit;
use ephemeral_rollups_sdk::ephem::commit_and_undelegate_accounts;

use crate::state::{GameState, PlayerState, GAME_SEED};
use crate::constants::{get_tile_config, MIN_GO_COUNT_TO_END, MIN_GO_PASSES_FOR_WINNER};
use crate::errors::GameErrorCode;

/// EndGame runs inside the Ephemeral Rollup.
/// It computes the winner on-chain, marks the game as ended,
/// and commits + undelegates the GameState back to L1.
/// 
/// The actual SOL payout happens via the separate `settle_game`
/// instruction on L1 (since the escrow PDA lives on mainchain).
#[commit]
#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct EndGame<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [GAME_SEED, game.creator.key().as_ref(), game_id.to_le_bytes().as_ref()],
        bump = game.bump
    )]
    pub game: Box<Account<'info, GameState>>,
}

pub fn end_game(ctx: Context<EndGame>, game_id: u64) -> Result<()> {
    let game = &mut ctx.accounts.game;

    require!(game.is_started, GameErrorCode::GameNotStarted);
    require!(!game.is_ended, GameErrorCode::GameEnded);
    require!(game.go_count >= MIN_GO_COUNT_TO_END, GameErrorCode::CannotEndGameYet);

    // ── Compute winner on-chain ──────────────────────────
    // Iterate through remaining_accounts (active player PDAs).
    // Eligible: go_passes >= 15 AND is_active == true
    // Winner: highest net worth (balance + sum of buy_price for owned tiles)

    let mut winner_pubkey: Option<Pubkey> = None;
    let mut highest_net_worth: u64 = 0;

    for account_info in ctx.remaining_accounts.iter() {
        let player_data = account_info.try_borrow_data()?;
        if player_data.len() < PlayerState::SPACE {
            continue;
        }

        if let Ok(player) = PlayerState::try_deserialize(&mut &player_data[..]) {
            // Must belong to this game and be active
            if player.game != game.key() || !player.is_active {
                continue;
            }

            // Must meet minimum GO passes
            if player.go_passes < MIN_GO_PASSES_FOR_WINNER {
                continue;
            }

            // Calculate net worth: balance + sum of buy_price for all owned tiles
            let mut net_worth = player.balance;
            for i in 0..40usize {
                if game.property_owners[i] == player.user {
                    let tile_config = get_tile_config(i as u8);
                    net_worth = net_worth.saturating_add(tile_config.buy_price);
                }
            }

            if net_worth > highest_net_worth {
                highest_net_worth = net_worth;
                winner_pubkey = Some(player.user);
            }
        }
    }

    require!(winner_pubkey.is_some(), GameErrorCode::NoEligibleWinner);

    let winner = winner_pubkey.unwrap();
    game.winner = Some(winner);
    game.is_ended = true;

    msg!(
        "Game {} ended! Winner: {} with net worth {}. Call settle_game on L1 for payout.",
        game_id, winner, highest_net_worth
    );

    // Serialize before commit+undelegate
    game.exit(&crate::ID)?;

    // Commit and undelegate the game account back to L1
    commit_and_undelegate_accounts(
        &ctx.accounts.user,
        vec![&ctx.accounts.game.to_account_info()],
        &ctx.accounts.magic_context,
        &ctx.accounts.magic_program,
    )?;

    Ok(())
}
