use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::commit;
use ephemeral_rollups_sdk::ephem::{CallHandler, CommitType, MagicAction, MagicInstructionBuilder};
use ephemeral_rollups_sdk::{ActionArgs, ShortAccountMeta};

use crate::state::{GameState, PlayerState, GAME_SEED, ESCROW_SEED};
use crate::constants::{
    get_tile_config,
    WEALTH_WEIGHT, GO_WEIGHT, WEALTH_NORM, MAX_EXPECTED_GO,
};
use crate::errors::GameErrorCode;

/// EndGame runs inside the Ephemeral Rollup.
/// It computes the winner on-chain using a weighted score formula,
/// marks the game as ended, and commits + triggers settle_game_action
/// on L1 via MagicAction (so the escrow payout happens atomically).
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

    /// CHECK: Escrow PDA — passed from frontend to save compute, validated by seeds
    #[account(
        seeds = [ESCROW_SEED, game.key().as_ref()],
        bump
    )]
    pub escrow: UncheckedAccount<'info>,

    /// CHECK: This program's own ID — required by MagicAction infrastructure
    pub program_id: AccountInfo<'info>,
}

pub fn end_game(ctx: Context<EndGame>, game_id: u64) -> Result<()> {
    let game = &mut ctx.accounts.game;

    require!(game.is_started, GameErrorCode::GameNotStarted);
    require!(!game.is_ended, GameErrorCode::GameEnded);
    require!(game.go_count >= game.max_go_count, GameErrorCode::CannotEndGameYet);

    // ── Hard minimum: winner must have >= half of max_go_count ──
    let min_go_for_winner: u16 = game.max_go_count / 2;

    // ── Compute winner on-chain using weighted score ──────────
    // Score = 70% wealth component + 30% Go component
    // wealth_component = raw_wealth * WEALTH_WEIGHT / 100
    // go_component     = min(go_passes, MAX_EXPECTED_GO) * WEALTH_NORM * GO_WEIGHT / MAX_EXPECTED_GO / 100

    let mut winner_pubkey: Option<Pubkey> = None;
    let mut highest_score: u64 = 0;

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

            // Hard rule: must have >= half of max_go_count
            if player.go_passes < min_go_for_winner {
                continue;
            }

            // Calculate raw wealth: balance + sum of buy_price for all owned tiles
            let mut raw_wealth: u64 = player.balance;
            for i in 0..40usize {
                if game.property_owners[i] == player.user {
                    let tile_config = get_tile_config(i as u8);
                    raw_wealth = raw_wealth.saturating_add(tile_config.buy_price);
                }
            }

            // Weighted score calculation
            let wealth_component = raw_wealth.saturating_mul(WEALTH_WEIGHT) / 100;
            let go_capped = (player.go_passes as u64).min(MAX_EXPECTED_GO);
            let go_component = go_capped
                .saturating_mul(WEALTH_NORM)
                .saturating_mul(GO_WEIGHT)
                / MAX_EXPECTED_GO
                / 100;
            let weighted_score = wealth_component.saturating_add(go_component);

            if weighted_score > highest_score {
                highest_score = weighted_score;
                winner_pubkey = Some(player.user);
            }
        }
    }

    require!(winner_pubkey.is_some(), GameErrorCode::NoEligibleWinner);

    let winner = winner_pubkey.unwrap();
    game.winner = Some(winner);
    game.is_ended = true;

    msg!(
        "Game {} ended! Winner: {} with weighted score {}. Triggering settle via MagicAction.",
        game_id, winner, highest_score
    );

    // Serialize before commit
    game.exit(&crate::ID)?;

    // ── Build MagicAction: commit game + trigger settle_game_action on L1 ──
    let ix_data = anchor_lang::InstructionData::data(
        &crate::instruction::SettleGameAction { game_id }
    );
    let action_args = ActionArgs::new(ix_data);

    let action_accounts = vec![
        ShortAccountMeta { pubkey: game.key(), is_writable: true },
        ShortAccountMeta { pubkey: ctx.accounts.escrow.key(), is_writable: true },  // passed from frontend, validated by seeds
        ShortAccountMeta { pubkey: winner, is_writable: true },                     // computed on-chain — secure
        ShortAccountMeta { pubkey: game.authority, is_writable: true },             // from game state
        ShortAccountMeta { pubkey: anchor_lang::system_program::ID, is_writable: false },
    ];

    let handler = CallHandler {
        destination_program: crate::ID,
        accounts: action_accounts,
        args: action_args,
        escrow_authority: ctx.accounts.user.to_account_info(),
        compute_units: 200_000,
    };

    let magic_action = MagicInstructionBuilder {
        payer: ctx.accounts.user.to_account_info(),
        magic_context: ctx.accounts.magic_context.to_account_info(),
        magic_program: ctx.accounts.magic_program.to_account_info(),
        magic_action: MagicAction::Commit(CommitType::WithHandler {
            commited_accounts: vec![ctx.accounts.game.to_account_info()],
            call_handlers: vec![handler],
        }),
    };

    magic_action.build_and_invoke()?;

    Ok(())
}
