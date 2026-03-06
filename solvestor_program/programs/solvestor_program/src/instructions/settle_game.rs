use anchor_lang::prelude::*;
use anchor_lang::system_program;
use ephemeral_rollups_sdk::anchor::action;

use crate::state::{GameState, GAME_SEED, ESCROW_SEED};
use crate::constants::HOUSE_FEE_BPS;
use crate::errors::GameErrorCode;

/// SettleGame runs on L1 (mainchain) — manual fallback.
/// It transfers the escrow funds: 95% to the winner, 5% to the house authority.
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
    let escrow_bump = ctx.bumps.escrow;
    let game_key = ctx.accounts.game.key();
    settle_game_inner(
        &ctx.accounts.escrow.to_account_info(),
        &ctx.accounts.winner.to_account_info(),
        &ctx.accounts.house_account.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
        &game_key,
        escrow_bump,
    )
}

// ── MagicAction handler variant ─────────────────────────────
// Invoked automatically by the ER when end_game commits via
// CommitType::WithHandler. The #[action] macro handles auth.
//
// IMPORTANT: During commit, the game account is still owned by
// the Delegation Program (DELeGGvXpWV...), NOT by our program.
// We cannot use Account<'info, GameState> because Anchor checks
// the owner. Instead we use AccountInfo and manually deserialize.
#[action]
#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct SettleGameAction<'info> {
    /// CHECK: Game account — during commit, owned by Delegation Program.
    /// Data has been committed (Finalize ran before CallHandler).
    /// We manually deserialize and validate in the handler.
    #[account(mut)]
    pub game: AccountInfo<'info>,

    /// CHECK: Escrow PDA holding the staked SOL
    #[account(mut)]
    pub escrow: SystemAccount<'info>,

    /// CHECK: The winner's wallet
    #[account(mut)]
    pub winner: SystemAccount<'info>,

    /// CHECK: The house authority
    #[account(mut)]
    pub house_account: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}
/// Small struct to hold just the fields needed for settlement
struct SettleParams {
    escrow_bump: u8,
    winner: Pubkey,
    authority: Pubkey,
}

/// Read only the fields needed for settlement directly from raw bytes.
/// Avoids deserializing the full ~1826-byte GameState struct to stay
/// within Solana's 4KB stack frame limit.
///
/// GameState field byte offsets (after 8-byte Anchor discriminator):
///   1747: authority (Pubkey)   1779: escrow_bump (u8)
///   1780: is_ended (bool)     1786: winner (Option<Pubkey>)
#[inline(never)]
fn extract_settle_params(
    game_info: &AccountInfo,
    winner_key: &Pubkey,
    house_key: &Pubkey,
) -> Result<SettleParams> {
    let data = game_info.try_borrow_data()?;

    // is_ended at offset 1780
    let is_ended = data[1780] != 0;
    require!(is_ended, GameErrorCode::GameNotEnded);

    // winner (Option<Pubkey>) at offset 1786: byte 0 = Some/None flag, bytes 1..33 = pubkey
    let has_winner = data[1786] != 0;
    require!(has_winner, GameErrorCode::WinnerNotDetermined);
    let winner = Pubkey::try_from(&data[1787..1819]).map_err(|_| GameErrorCode::WinnerNotDetermined)?;

    require!(*winner_key == winner, GameErrorCode::Unauthorized);

    // authority (Pubkey) at offset 1747
    let authority = Pubkey::try_from(&data[1747..1779]).map_err(|_| GameErrorCode::Unauthorized)?;
    require!(*house_key == authority, GameErrorCode::Unauthorized);

    // escrow_bump (u8) at offset 1779
    let escrow_bump = data[1779];

    Ok(SettleParams {
        escrow_bump,
        winner,
        authority,
    })
}

pub fn settle_game_action(ctx: Context<SettleGameAction>, _game_id: u64) -> Result<()> {
    let params = extract_settle_params(
        &ctx.accounts.game,
        &ctx.accounts.winner.key(),
        &ctx.accounts.house_account.key(),
    )?;

    let game_key = ctx.accounts.game.key();

    msg!(
        "SettleGameAction: game={}, winner={}, house={}",
        game_key, params.winner, params.authority
    );

    settle_game_inner(
        &ctx.accounts.escrow.to_account_info(),
        &ctx.accounts.winner.to_account_info(),
        &ctx.accounts.house_account.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
        &game_key,
        params.escrow_bump,
    )
}

// ── Shared settlement logic ─────────────────────────────────
// Uses system_program::transfer with invoke_signed (PDA signer seeds)
// so transfers work in both direct calls AND MagicAction CPI context.
//
// Distributes ALL escrow lamports above rent-exempt minimum.
// This includes forfeited stakes from players who left early.
fn settle_game_inner<'info>(
    escrow: &AccountInfo<'info>,
    winner: &AccountInfo<'info>,
    house_account: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    game_key: &Pubkey,
    escrow_bump: u8,
) -> Result<()> {
    let escrow_balance = escrow.lamports();

    if escrow_balance == 0 {
        msg!("Nothing to settle — escrow is empty");
        return Ok(());
    }

    // Distribute everything above rent-exempt minimum
    let rent_exempt_min = Rent::get()?.minimum_balance(0);
    let distributable = escrow_balance.saturating_sub(rent_exempt_min);

    if distributable == 0 {
        msg!("Escrow only has rent-exempt lamports — nothing to distribute");
        return Ok(());
    }

    // Calculate house fee (5%) and winner payout (95%)
    let house_fee = distributable
        .checked_mul(HOUSE_FEE_BPS).unwrap_or(0) / 10_000;
    let winner_payout = distributable.saturating_sub(house_fee);

    // Escrow PDA signer seeds: [ESCROW_SEED, game_key, bump]
    let escrow_seeds: &[&[u8]] = &[
        ESCROW_SEED,
        game_key.as_ref(),
        &[escrow_bump],
    ];
    let signer_seeds = &[escrow_seeds];

    // Transfer winner payout from escrow via system_program::transfer (invoke_signed)
    if winner_payout > 0 {
        system_program::transfer(
            CpiContext::new_with_signer(
                system_program.clone(),
                system_program::Transfer {
                    from: escrow.clone(),
                    to: winner.clone(),
                },
                signer_seeds,
            ),
            winner_payout,
        )?;
    }

    // Transfer house fee from escrow via system_program::transfer (invoke_signed)
    if house_fee > 0 {
        system_program::transfer(
            CpiContext::new_with_signer(
                system_program.clone(),
                system_program::Transfer {
                    from: escrow.clone(),
                    to: house_account.clone(),
                },
                signer_seeds,
            ),
            house_fee,
        )?;
    }

    msg!(
        "Settlement complete! Distributed {} of {} lamports. Winner {} received {}, house fee {}",
        distributable,
        escrow_balance,
        winner.key(),
        winner_payout,
        house_fee
    );

    Ok(())
}


