use anchor_lang::prelude::*;
use ephemeral_vrf_sdk::anchor::vrf;
use ephemeral_vrf_sdk::instructions::{create_request_randomness_ix, RequestRandomnessParams};
use ephemeral_vrf_sdk::types::SerializableAccountMeta;
use session_keys::{session_auth_or, Session, SessionError, SessionToken};

use crate::state::{GameState, PlayerState, PLAYER_SEED};
use crate::constants::{ROLL_COOLDOWN, GO_BONUS};
use crate::errors::GameErrorCode;

// ─── Roll Dice: Request VRF ─────────────────────────────────

#[vrf]
#[derive(Accounts, Session)]
pub struct RollDice<'info> {
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

    /// CHECK: The oracle queue
    #[account(mut, address = ephemeral_vrf_sdk::consts::DEFAULT_EPHEMERAL_QUEUE)]
    pub oracle_queue: AccountInfo<'info>,

    #[session(
        signer = payer,
        authority = player.authority.key()
    )]
    pub session_token: Option<Account<'info, SessionToken>>,
}

// ─── Callback: VRF delivers randomness ──────────────────────

#[derive(Accounts)]
pub struct CallbackRollDice<'info> {
    /// Ensures the callback is called by the VRF program via CPI
    #[account(address = ephemeral_vrf_sdk::consts::VRF_PROGRAM_IDENTITY)]
    pub vrf_program_identity: Signer<'info>,

    #[account(mut)]
    pub game: Box<Account<'info, GameState>>,

    #[account(mut)]
    pub player: Account<'info, PlayerState>,
}

// ─── Handlers ───────────────────────────────────────────────

#[session_auth_or(
    ctx.accounts.player.authority.key() == ctx.accounts.payer.key(),
    SessionError::InvalidToken
)]
pub fn roll_dice(ctx: Context<RollDice>, client_seed: u8) -> Result<()> {
    let game = &ctx.accounts.game;
    let player = &ctx.accounts.player;
    let clock = Clock::get()?;

    require!(game.is_started, GameErrorCode::GameNotStarted);
    require!(!game.is_ended, GameErrorCode::GameEnded);
    require!(player.is_active, GameErrorCode::PlayerNotActive);

    // Verify player is in the game
    let mut found = false;
    for p in game.players.iter() {
        if *p == player.user {
            found = true;
            break;
        }
    }
    require!(found, GameErrorCode::PlayerNotInGame);

    // Check cooldown (0 = first roll, no cooldown)
    if player.last_roll_timestamp > 0 {
        require!(
            clock.unix_timestamp >= player.last_roll_timestamp + ROLL_COOLDOWN,
            GameErrorCode::CooldownActive
        );
    }

    msg!("Requesting VRF randomness for dice roll...");

    // Create the VRF request using the correct discriminator pattern
    let ix = create_request_randomness_ix(RequestRandomnessParams {
        payer: ctx.accounts.payer.key(),
        oracle_queue: ctx.accounts.oracle_queue.key(),
        callback_program_id: crate::ID,
        callback_discriminator: crate::instruction::CallbackRollDice::DISCRIMINATOR.to_vec(),
        caller_seed: [client_seed; 32],
        accounts_metas: Some(vec![
            SerializableAccountMeta {
                pubkey: ctx.accounts.game.key(),
                is_signer: false,
                is_writable: true,
            },
            SerializableAccountMeta {
                pubkey: ctx.accounts.player.key(),
                is_signer: false,
                is_writable: true,
            },
        ]),
        ..Default::default()
    });

    ctx.accounts
        .invoke_signed_vrf(&ctx.accounts.payer.to_account_info(), &ix)?;

    Ok(())
}

pub fn callback_roll_dice(ctx: Context<CallbackRollDice>, randomness: [u8; 32]) -> Result<()> {
    let game = &mut ctx.accounts.game;
    let player = &mut ctx.accounts.player;
    let clock = Clock::get()?;

    // Derive two independent dice values from the 32-byte randomness
    let die_1 = ephemeral_vrf_sdk::rnd::random_u8_with_range(&randomness, 1, 6);

    // Use second half of randomness for die_2 to get independent values
    let mut randomness_shifted = [0u8; 32];
    randomness_shifted[..16].copy_from_slice(&randomness[16..32]);
    randomness_shifted[16..32].copy_from_slice(&randomness[0..16]);
    let die_2 = ephemeral_vrf_sdk::rnd::random_u8_with_range(&randomness_shifted, 1, 6);

    let total_roll = die_1 as u16 + die_2 as u16;
    msg!("Rolled a {} ({} + {})", total_roll, die_1, die_2);

    // Store dice result for UI display and pseudo-random tile effects
    player.last_dice_result = [die_1, die_2];
    player.last_roll_timestamp = clock.unix_timestamp;

    // ── GRAVEYARD ESCAPE CHECK ──────────────────────────
    // If player is trapped in the graveyard, they can ONLY escape by rolling doubles.
    // On doubles: escape and move normally from tile 10.
    // On non-doubles: stay trapped, turn ends.
    if player.is_in_graveyard {
        if die_1 == die_2 {
            // DOUBLES! Escape the graveyard!
            player.is_in_graveyard = false;
            msg!("Rolled doubles ({} + {})! Escaped the Graveyard!", die_1, die_2);
            // Now move normally from graveyard (tile 10)
            let old_pos = 10u16;
            let mut new_pos = old_pos + total_roll;
            if new_pos >= 40 {
                new_pos %= 40;
                player.balance = player.balance.saturating_add(GO_BONUS);
                player.go_passes = player.go_passes.saturating_add(1);
                if player.go_passes > game.go_count {
                    game.go_count = player.go_passes;
                }
                msg!("Passed GO on escape! +{}", GO_BONUS);
            }
            player.current_position = new_pos as u8;
            msg!("Escaped to tile {}", player.current_position);
        } else {
            // No doubles — still trapped
            msg!("No doubles ({} + {}). Still trapped in Graveyard!", die_1, die_2);
        }
        return Ok(());
    }

    // ── NORMAL MOVEMENT ─────────────────────────────────
    let old_pos = player.current_position as u16;
    let mut new_pos = old_pos + total_roll;

    // Check if player passed or landed on GO
    if new_pos >= 40 {
        new_pos %= 40;
        player.balance = player.balance.saturating_add(GO_BONUS);
        player.go_passes = player.go_passes.saturating_add(1);

        // Update global go_count to track highest per-player go_passes
        if player.go_passes > game.go_count {
            game.go_count = player.go_passes;
        }

        msg!(
            "Passed GO! Balance +{}, go_passes: {}, global go_count: {}",
            GO_BONUS,
            player.go_passes,
            game.go_count
        );
    }

    player.current_position = new_pos as u8;

    msg!(
        "Player {} moved to tile {}",
        player.user,
        player.current_position
    );

    Ok(())
}
