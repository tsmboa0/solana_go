use anchor_lang::prelude::*;
use session_keys::{session_auth_or, Session, SessionError, SessionToken};

use crate::state::{GameState, PlayerState, PLAYER_SEED};
use crate::constants::{
    get_tile_config, calculate_rent, TileType, CornerType,
    DEFI_STAKE_COST, DEFI_LANDING_YIELD, DEFI_LANDING_FEE,
    SHIELD_COST, MEV_PENALTY_BPS, TAX_AMOUNT, POTION_COST,
    GRAVEYARD_PENALTY_BPS, SCHOOL_BONUS, GOVERNANCE_BONUS,
    GO_BONUS,
};
use crate::errors::GameErrorCode;

// ─── Accounts ────────────────────────────────────────────────
//
// For ownable tiles with rent, the owner's PlayerState must be
// passed as remaining_accounts[0] (writable).

#[derive(Accounts, Session)]
pub struct PerformTileAction<'info> {
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

// ─── Chance Cards ────────────────────────────────────────────
// Based on die_1 (1-6). Can move player to specific tiles.

fn apply_chance_card(player: &mut PlayerState, game: &mut GameState, die_value: u8) {
    match die_value {
        1 => {
            // "Airdrop Season!" → +200
            player.balance = player.balance.saturating_add(200);
            msg!("Chance: Airdrop Season! +200");
        }
        2 => {
            // "Advance to GO" → move to tile 0, collect bonus
            player.current_position = 0;
            player.balance = player.balance.saturating_add(GO_BONUS);
            player.go_passes = player.go_passes.saturating_add(1);
            if player.go_passes > game.go_count {
                game.go_count = player.go_passes;
            }
            msg!("Chance: Advance to GO! Collect {} bonus!", GO_BONUS);
        }
        3 => {
            // "Sent to Graveyard!" → graveyard mechanic
            send_to_graveyard(player);
        }
        4 => {
            // "Network Upgrade" → advance to nearest RPC (tiles 5, 15, 25, 35)
            let pos = player.current_position;
            let nearest_rpc = if pos < 5 || pos >= 35 { 5 }
                             else if pos < 15 { 15 }
                             else if pos < 25 { 25 }
                             else { 35 };
            player.current_position = nearest_rpc;
            msg!("Chance: Network Upgrade! Move to RPC tile {}", nearest_rpc);
        }
        5 => {
            // "Scholarship" → advance to School (Blueshift=37 or Turbine=38)
            let school = if player.current_position <= 37 { 37 } else { 38 };
            player.current_position = school;
            player.balance = player.balance.saturating_add(SCHOOL_BONUS);
            msg!("Chance: Conference Scholarship! Move to School tile {} and +{}", school, SCHOOL_BONUS);
        }
        _ => {
            // 6: "Protocol Hack!" → -300
            player.balance = player.balance.saturating_sub(300);
            msg!("Chance: Protocol Hack! -300");
        }
    }
}

// ─── Community Chest Cards ───────────────────────────────────
// Based on die_2 (1-6). Can move player to specific tiles.

fn apply_chest_card(player: &mut PlayerState, _game: &mut GameState, die_value: u8) {
    match die_value {
        1 => {
            // "DAO Treasury Grant" → +250
            player.balance = player.balance.saturating_add(250);
            msg!("Chest: DAO Treasury Grant! +250");
        }
        2 => {
            // "Bug Bounty Reward" → +100
            player.balance = player.balance.saturating_add(100);
            msg!("Chest: Bug Bounty Reward! +100");
        }
        3 => {
            // "Smart Contract Audit Fee" → -150
            player.balance = player.balance.saturating_sub(150);
            msg!("Chest: Smart Contract Audit Fee! -150");
        }
        4 => {
            // "Advance to Grant" → move to tile 20
            player.current_position = 20;
            msg!("Chest: Advance to Grant tile!");
        }
        5 => {
            // "Sent to Liquidation" → move to Liquidation (30)
            player.current_position = 30;
            // Apply liquidation effect immediately
            apply_liquidation(player);
            msg!("Chest: Sent to Liquidation!");
        }
        _ => {
            // 6: "NFT Royalties" → +175
            player.balance = player.balance.saturating_add(175);
            msg!("Chest: NFT Royalties! +175");
        }
    }
}

// ─── Graveyard Mechanic ──────────────────────────────────────

fn send_to_graveyard(player: &mut PlayerState) {
    player.current_position = 10; // Graveyard tile

    if player.has_potion {
        // Potion saves them! Consume it and they're just visiting
        player.has_potion = false;
        msg!("BioDAO Potion used! Resurrected from the dead — just visiting Graveyard");
    } else {
        // No potion: lose 40% of balance and get trapped
        let penalty = player.balance
            .checked_mul(GRAVEYARD_PENALTY_BPS).unwrap_or(0) / 10_000;
        player.balance = player.balance.saturating_sub(penalty);
        player.is_in_graveyard = true;
        msg!(
            "Trapped in Graveyard! Lost {} (40% of balance). Roll doubles to escape!",
            penalty
        );
    }
}

// ─── Liquidation Effect ──────────────────────────────────────

fn apply_liquidation(player: &mut PlayerState) {
    // Lose DeFi position (if any)
    if player.has_staked_defi {
        player.has_staked_defi = false;
        msg!("DeFi position liquidated! Lost staking position");
    }

    // Lose 10% balance
    let penalty = player.balance / 10;
    player.balance = player.balance.saturating_sub(penalty);

    // Send to graveyard
    send_to_graveyard(player);
}

// ─── Main Handler ────────────────────────────────────────────

#[session_auth_or(
    ctx.accounts.player.authority.key() == ctx.accounts.payer.key(),
    SessionError::InvalidToken
)]
pub fn perform_tile_action(
    ctx: Context<PerformTileAction>,
    tile_index: u8,
    choose_action: bool, // true = opt-in (buy shield/potion, stake DeFi)
) -> Result<()> {
    let game = &mut ctx.accounts.game;
    let player = &mut ctx.accounts.player;

    require!(game.is_started, GameErrorCode::GameNotStarted);
    require!(!game.is_ended, GameErrorCode::GameEnded);
    require!(player.is_active, GameErrorCode::PlayerNotActive);
    require!(tile_index < 40, GameErrorCode::InvalidTileIndex);
    require!(player.current_position == tile_index, GameErrorCode::NotOnTile);

    // Player trapped in graveyard can't perform actions (only roll dice)
    require!(!player.is_in_graveyard, GameErrorCode::TrappedInGraveyard);

    let tile_config = get_tile_config(tile_index);
    let idx = tile_index as usize;

    // Extract dice results before any mutable borrows
    let die_1 = player.last_dice_result[0];
    let die_2 = player.last_dice_result[1];

    match tile_config.tile_type {
        // ═══════════════════════════════════════════════════
        // OWNABLE TILES — auto-pay rent if owned by another
        // ═══════════════════════════════════════════════════
        TileType::Ownable => {
            let owner = game.property_owners[idx];

            if owner == Pubkey::default() {
                // Unowned — player can separately call buy_property if they want
                msg!("Tile {} is unowned. Use buy_property to purchase.", tile_index);

                // ── Special: DeSci/BioDAO (tile 39) also sells potions ──
                if tile_index == 39 && choose_action {
                    require!(!player.has_potion, GameErrorCode::AlreadyHasPotion);
                    require!(player.balance >= POTION_COST, GameErrorCode::CannotAffordPotion);
                    player.balance = player.balance.saturating_sub(POTION_COST);
                    player.has_potion = true;
                    msg!("Purchased BioDAO Resurrection Potion for {}!", POTION_COST);
                }
            } else if owner == player.user {
                // Own property — nothing happens
                msg!("You own tile {}. Safe!", tile_index);

                // DeSci: owner can still buy potion
                if tile_index == 39 && choose_action && !player.has_potion {
                    require!(player.balance >= POTION_COST, GameErrorCode::CannotAffordPotion);
                    player.balance = player.balance.saturating_sub(POTION_COST);
                    player.has_potion = true;
                    msg!("Purchased BioDAO Resurrection Potion for {}!", POTION_COST);
                }
            } else {
                // Owned by someone else — AUTO-PAY RENT
                let rent_amount = calculate_rent(
                    &game.property_owners,
                    &game.property_upgrade_levels,
                    tile_index,
                    &owner,
                );

                // Pay whatever the player can afford
                let actual_rent = rent_amount.min(player.balance);
                player.balance = player.balance.saturating_sub(actual_rent);

                // Credit the owner via remaining_accounts[0]
                // The client MUST pass the owner's PlayerState PDA as remaining_accounts[0]
                if let Some(owner_account_info) = ctx.remaining_accounts.first() {
                    let mut owner_data = owner_account_info.try_borrow_mut_data()?;
                    if let Ok(mut owner_player) = PlayerState::try_deserialize(&mut &owner_data[..]) {
                        if owner_player.user == owner && owner_player.game == game.key() {
                            owner_player.balance = owner_player.balance.saturating_add(actual_rent);
                            // Write back
                            let dst = &mut owner_data[8..]; // skip discriminator
                            let serialized = owner_player.try_to_vec()?;
                            dst[..serialized.len()].copy_from_slice(&serialized);
                        }
                    }
                }

                msg!("Paid {} rent to {} for tile {}", actual_rent, owner, tile_index);

                // DeSci: can still buy potion even after paying rent
                if tile_index == 39 && choose_action && !player.has_potion {
                    require!(player.balance >= POTION_COST, GameErrorCode::CannotAffordPotion);
                    player.balance = player.balance.saturating_sub(POTION_COST);
                    player.has_potion = true;
                    msg!("Purchased BioDAO Resurrection Potion for {}!", POTION_COST);
                }
            }
        }

        // ═══════════════════════════════════════════════════
        // CORNER TILES
        // ═══════════════════════════════════════════════════
        TileType::Corner => {
            match tile_config.corner_type {
                Some(CornerType::Go) => {
                    // GO bonus handled in callback_roll_dice when passing GO
                    msg!("Landed on GO — bonus already applied when passing");
                }
                Some(CornerType::Graveyard) => {
                    // Just visiting (being SENT here is handled by chance cards / liquidation)
                    msg!("Just visiting the Graveyard");
                }
                Some(CornerType::Grant) => {
                    // Random grant: 100 + die_1 * 40 (range 140-340)
                    let grant = 100 + (die_1 as u64 * 40);
                    player.balance = player.balance.saturating_add(grant);
                    msg!("Received ecosystem grant of {}!", grant);
                }
                Some(CornerType::Liquidation) => {
                    apply_liquidation(player);
                }
                None => {
                    msg!("Unknown corner tile");
                }
            }
        }

        // ═══════════════════════════════════════════════════
        // TAX
        // ═══════════════════════════════════════════════════
        TileType::Tax => {
            let tax = TAX_AMOUNT.min(player.balance);
            player.balance = player.balance.saturating_sub(tax);
            msg!("Paid {} in USDC taxes", tax);
        }

        // ═══════════════════════════════════════════════════
        // EVENT TILES (Chance, Chest, Meme, Flat reward)
        // ═══════════════════════════════════════════════════
        TileType::Event => {
            if tile_config.reward_is_random {
                match tile_index {
                    // Community Chest tiles — use die_2
                    2 | 17 | 33 => {
                        apply_chest_card(player, game, die_2);
                    }
                    // Chance tiles — use die_1
                    7 | 27 => {
                        apply_chance_card(player, game, die_1);
                    }
                    // pump.fun (Meme, tile 32) — volatile! Double or lose
                    32 => {
                        let total_roll = die_1 as u64 + die_2 as u64;
                        if die_1 > 3 {
                            // Moon! Gain total_roll * 30
                            let gain = total_roll * 30;
                            player.balance = player.balance.saturating_add(gain);
                            msg!("pump.fun MOON! +{}", gain);
                        } else {
                            // Rug! Lose total_roll * 25
                            let loss = total_roll * 25;
                            player.balance = player.balance.saturating_sub(loss);
                            msg!("pump.fun RUG! -{}", loss);
                        }
                    }
                    _ => {
                        apply_chance_card(player, game, die_1);
                    }
                }
            } else {
                // Flat reward (e.g., Solana Conf tile 34 = +500)
                player.balance = player.balance.saturating_add(tile_config.reward_value);
                msg!("Solana Conf reward: +{}!", tile_config.reward_value);
            }
        }

        // ═══════════════════════════════════════════════════
        // RISK (MEV Bot / MEV Sandwich)
        // ═══════════════════════════════════════════════════
        TileType::Risk => {
            if player.has_shield {
                // Shield protects — consume it
                player.has_shield = false;
                msg!("Arcium Shield protected you from MEV attack! (Shield consumed)");
            } else {
                // 10% penalty
                let penalty = player.balance
                    .checked_mul(MEV_PENALTY_BPS).unwrap_or(0) / 10_000;
                player.balance = player.balance.saturating_sub(penalty);
                msg!("MEV attack! Lost {} (10% of balance)", penalty);
            }
        }

        // ═══════════════════════════════════════════════════
        // PRIVACY (Arcium = tile 12) — buy shield
        // ═══════════════════════════════════════════════════
        TileType::Privacy => {
            if choose_action {
                require!(!player.has_shield, GameErrorCode::AlreadyHasShield);
                require!(player.balance >= SHIELD_COST, GameErrorCode::CannotAffordShield);
                player.balance = player.balance.saturating_sub(SHIELD_COST);
                player.has_shield = true;
                msg!("Purchased Privacy Shield for {}!", SHIELD_COST);
            } else {
                msg!("Visited privacy protocol. Pass choose_action=true to buy shield.");
            }
        }

        // ═══════════════════════════════════════════════════
        // DEFI — Stake or earn yield / pay landing fee
        // ═══════════════════════════════════════════════════
        TileType::DeFi => {
            if player.has_staked_defi {
                // Already staked → earn yield on landing
                player.balance = player.balance.saturating_add(DEFI_LANDING_YIELD);
                msg!("DeFi yield! +{} from staking position", DEFI_LANDING_YIELD);
            } else if choose_action {
                // Player opts to stake
                require!(player.balance >= DEFI_STAKE_COST, GameErrorCode::CannotAffordStake);
                player.balance = player.balance.saturating_sub(DEFI_STAKE_COST);
                player.has_staked_defi = true;
                msg!("Staked {} in DeFi! Earn {} on every DeFi landing!",
                    DEFI_STAKE_COST, DEFI_LANDING_YIELD);
            } else {
                // Not staked and didn't choose to → pay landing fee
                let fee = DEFI_LANDING_FEE.min(player.balance);
                player.balance = player.balance.saturating_sub(fee);
                msg!("DeFi landing fee: -{}", fee);
            }
        }

        // ═══════════════════════════════════════════════════
        // NEUTRAL (Blueshift=37, Turbine=38 = School tiles)
        // ═══════════════════════════════════════════════════
        TileType::Neutral => {
            match tile_index {
                37 | 38 => {
                    // School tiles — small education bonus
                    player.balance = player.balance.saturating_add(SCHOOL_BONUS);
                    msg!("Solana School! Learned something new. +{}", SCHOOL_BONUS);
                }
                _ => {
                    msg!("Neutral tile. No effect.");
                }
            }
        }

        // ═══════════════════════════════════════════════════
        // GOVERNANCE — small voting reward
        // ═══════════════════════════════════════════════════
        TileType::Governance => {
            player.balance = player.balance.saturating_add(GOVERNANCE_BONUS);
            msg!("Participated in governance voting! +{}", GOVERNANCE_BONUS);
        }
    }

    Ok(())
}
