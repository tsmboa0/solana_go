// ============================================================
// Tile Action Mirror — Solvestor (SWS)
// ============================================================
// Pure function mirroring the on-chain perform_tile_action.rs
// exactly. Used for optimistic UI updates in beginner mode.
//
// Given the tile index, player state, dice result, and property
// owners, this function predicts the EXACT outcome that the
// on-chain program will produce.
// ============================================================

import { TILES } from '@/config/boardTiles';
import {
    GO_BONUS,
    TAX_AMOUNT,
    DEFI_STAKE_COST,
    DEFI_LANDING_YIELD,
    DEFI_LANDING_FEE,
    SHIELD_COST,
    MEV_PENALTY_BPS,
    POTION_COST,
    GRAVEYARD_PENALTY_BPS,
    SCHOOL_BONUS,
    GOVERNANCE_BONUS,
    TILE_GRAVEYARD,
    TILE_PUMP_FUN,
    TILE_SOLANA_CONF,
    TILE_DESCI,
    CHEST_TILES,
    CHANCE_TILES,
    SCHOOL_TILES,
    RPC_TILES,
    DEFAULT_PUBKEY,
} from '@/config/onChainConstants';

// ─── Types ───────────────────────────────────────────────────

export interface PlayerLocalState {
    id: string;           // pubkey string
    balance: number;
    hasShield: boolean;
    hasStakedDefi: boolean;
    hasPotion: boolean;
    isInGraveyard: boolean;
}

export interface ChoiceOption {
    id: string;
    label: string;
    cost: number;
    icon: string;         // emoji or lucide icon name
    description: string;
}

export interface TileActionResult {
    /** Net balance change (positive = credit, negative = debit) */
    balanceChange: number;
    /** If player is teleported (chance/chest cards, liquidation) */
    newPosition?: number;
    /** Human-readable message describing what happened */
    message: string;
    /** Type of visual effect to show */
    effectType: 'credit' | 'debit' | 'teleport' | 'neutral' | 'choice' | 'graveyard';
    /** For choice tiles: options the player can pick from */
    choiceOptions?: ChoiceOption[];
    /** Whether this result requires user interaction (choice) */
    requiresChoice: boolean;
    /** Additional state changes */
    stateChanges?: {
        hasShield?: boolean;
        hasStakedDefi?: boolean;
        hasPotion?: boolean;
        isInGraveyard?: boolean;
    };
    /** Amount paid to property owner (for rent) */
    rentPaidTo?: string;
    rentAmount?: number;
}

// ─── Chance Cards (die_1, values 1-6) ────────────────────────

function applyChanceCard(
    die1: number,
    player: PlayerLocalState,
): TileActionResult {
    switch (die1) {
        case 1:
            return {
                balanceChange: 200,
                message: 'Airdrop Season! +200',
                effectType: 'credit',
                requiresChoice: false,
            };
        case 2:
            return {
                balanceChange: GO_BONUS,
                newPosition: 0,
                message: `Advance to GO! Collect ${GO_BONUS} bonus!`,
                effectType: 'teleport',
                requiresChoice: false,
            };
        case 3: {
            // Sent to Graveyard
            return applyGraveyard(player);
        }
        case 4: {
            // Network Upgrade — advance to nearest RPC
            const pos = 0; // Will be overridden by caller's position
            // We handle nearest RPC calculation in the wrapper
            return {
                balanceChange: 0,
                message: 'Network Upgrade! Move to nearest RPC tile',
                effectType: 'teleport',
                requiresChoice: false,
            };
        }
        case 5: {
            // Scholarship — advance to school
            return {
                balanceChange: SCHOOL_BONUS,
                message: `Conference Scholarship! Move to School and +${SCHOOL_BONUS}`,
                effectType: 'teleport',
                requiresChoice: false,
            };
        }
        default:
            // 6: Protocol Hack
            return {
                balanceChange: -300,
                message: 'Protocol Hack! -300',
                effectType: 'debit',
                requiresChoice: false,
            };
    }
}

// ─── Community Chest Cards (die_2, values 1-6) ───────────────

function applyChestCard(die2: number): TileActionResult {
    switch (die2) {
        case 1:
            return {
                balanceChange: 250,
                message: 'DAO Treasury Grant! +250',
                effectType: 'credit',
                requiresChoice: false,
            };
        case 2:
            return {
                balanceChange: 100,
                message: 'Bug Bounty Reward! +100',
                effectType: 'credit',
                requiresChoice: false,
            };
        case 3:
            return {
                balanceChange: -150,
                message: 'Smart Contract Audit Fee! -150',
                effectType: 'debit',
                requiresChoice: false,
            };
        case 4:
            return {
                balanceChange: 0,
                newPosition: 20,
                message: 'Advance to Grant tile!',
                effectType: 'teleport',
                requiresChoice: false,
            };
        case 5: {
            // Sent to Liquidation (tile 30) → applies liquidation
            return {
                balanceChange: 0, // Liquidation handles its own calculation
                newPosition: 30,
                message: 'Sent to Liquidation!',
                effectType: 'graveyard',
                requiresChoice: false,
                // Note: actual liquidation effect computed separately
            };
        }
        default:
            // 6: NFT Royalties
            return {
                balanceChange: 175,
                message: 'NFT Royalties! +175',
                effectType: 'credit',
                requiresChoice: false,
            };
    }
}

// ─── Graveyard Mechanic ──────────────────────────────────────

function applyGraveyard(player: PlayerLocalState): TileActionResult {
    if (player.hasPotion) {
        return {
            balanceChange: 0,
            newPosition: TILE_GRAVEYARD,
            message: 'BioDAO Potion used! Resurrected — just visiting Graveyard',
            effectType: 'neutral',
            requiresChoice: false,
            stateChanges: { hasPotion: false },
        };
    }

    const penalty = Math.floor(player.balance * GRAVEYARD_PENALTY_BPS / 10000);
    return {
        balanceChange: -penalty,
        newPosition: TILE_GRAVEYARD,
        message: `Trapped in Graveyard! Lost ${penalty} (40% of balance). Roll doubles to escape!`,
        effectType: 'graveyard',
        requiresChoice: false,
        stateChanges: { isInGraveyard: true },
    };
}

// ─── Liquidation Effect ──────────────────────────────────────

function applyLiquidation(player: PlayerLocalState): TileActionResult {
    let totalPenalty = 0;
    const stateChanges: TileActionResult['stateChanges'] = {};

    // Lose DeFi position
    if (player.hasStakedDefi) {
        stateChanges.hasStakedDefi = false;
    }

    // Lose 10% balance
    const tenPercent = Math.floor(player.balance / 10);
    totalPenalty += tenPercent;

    // Then graveyard
    const afterLiquidation = player.balance - tenPercent;
    const gravePenalty = player.hasPotion
        ? 0
        : Math.floor(afterLiquidation * GRAVEYARD_PENALTY_BPS / 10000);

    totalPenalty += gravePenalty;

    if (player.hasPotion) {
        stateChanges.hasPotion = false;
    } else {
        stateChanges.isInGraveyard = true;
    }

    return {
        balanceChange: -totalPenalty,
        newPosition: TILE_GRAVEYARD,
        message: player.hasPotion
            ? `Liquidated! Lost ${tenPercent} (10%). Potion saved you from Graveyard!`
            : `Liquidated! Lost ${totalPenalty}. Trapped in Graveyard!`,
        effectType: 'graveyard',
        requiresChoice: false,
        stateChanges,
    };
}

// ─── Main Prediction Function ────────────────────────────────

/**
 * Predicts the exact outcome of perform_tile_action for a given
 * tile, player state, and dice result. Mirrors the on-chain logic.
 */
export function predictTileAction(
    tileIndex: number,
    player: PlayerLocalState,
    diceResult: [number, number],
    propertyOwners: Record<number, string>,
    currentPosition: number,
): TileActionResult {
    const tile = TILES[tileIndex];
    if (!tile) {
        return { balanceChange: 0, message: 'Unknown tile', effectType: 'neutral', requiresChoice: false };
    }

    const die1 = diceResult[0];
    const die2 = diceResult[1];
    const fn = tile.tile_function as any;
    const actionType = fn.action_type;

    // ═════════════════════════════════════════════════════
    // OWNABLE TILES
    // ═════════════════════════════════════════════════════
    if (actionType === 'ownable') {
        const ownerStr = propertyOwners[tileIndex];
        const isUnowned = !ownerStr || ownerStr === DEFAULT_PUBKEY;
        const isOwnProperty = ownerStr === player.id;

        if (isUnowned) {
            // Unowned — buy is separate instruction, no auto-effect
            // Special: DeSci (tile 39) can sell potions
            const result: TileActionResult = {
                balanceChange: 0,
                message: `${tile.project_name} is available for purchase!`,
                effectType: 'neutral',
                requiresChoice: false,
            };

            if (tileIndex === TILE_DESCI && !player.hasPotion) {
                result.effectType = 'choice';
                result.requiresChoice = true;
                result.choiceOptions = [{
                    id: 'buy_potion',
                    label: `Buy Potion (${POTION_COST})`,
                    cost: POTION_COST,
                    icon: '🧪',
                    description: 'Protects from Graveyard trap',
                }];
            }
            return result;
        }

        if (isOwnProperty) {
            const result: TileActionResult = {
                balanceChange: 0,
                message: `You own ${tile.project_name}. Safe!`,
                effectType: 'neutral',
                requiresChoice: false,
            };

            // DeSci owner can still buy potion
            if (tileIndex === TILE_DESCI && !player.hasPotion) {
                result.effectType = 'choice';
                result.requiresChoice = true;
                result.choiceOptions = [{
                    id: 'buy_potion',
                    label: `Buy Potion (${POTION_COST})`,
                    cost: POTION_COST,
                    icon: '🧪',
                    description: 'Protects from Graveyard trap',
                }];
            }
            return result;
        }

        // Owned by someone else — AUTO-PAY RENT
        // Simple rent calculation (base rent from tile config)
        const rentAmount = Math.min(fn.rent_value || 0, player.balance);
        return {
            balanceChange: -rentAmount,
            message: `Paid ${rentAmount} rent for ${tile.project_name}`,
            effectType: 'debit',
            requiresChoice: false,
            rentPaidTo: ownerStr,
            rentAmount,
        };
    }

    // ═════════════════════════════════════════════════════
    // CORNER TILES
    // ═════════════════════════════════════════════════════
    if (actionType === 'corner') {
        switch (fn.corner_type) {
            case 'go':
                return {
                    balanceChange: 0,
                    message: 'Landed on GO — bonus already applied when passing',
                    effectType: 'neutral',
                    requiresChoice: false,
                };
            case 'graveyard':
                return {
                    balanceChange: 0,
                    message: 'Just visiting the Graveyard',
                    effectType: 'neutral',
                    requiresChoice: false,
                };
            case 'grant': {
                const grant = 100 + (die1 * 40);
                return {
                    balanceChange: grant,
                    message: `Received ecosystem grant of ${grant}!`,
                    effectType: 'credit',
                    requiresChoice: false,
                };
            }
            case 'liquidation':
                return applyLiquidation(player);
            default:
                return { balanceChange: 0, message: 'Unknown corner', effectType: 'neutral', requiresChoice: false };
        }
    }

    // ═════════════════════════════════════════════════════
    // TAX
    // ═════════════════════════════════════════════════════
    if (actionType === 'risk' && fn.penalty_type === 'flat') {
        // Tax tile
        const tax = Math.min(TAX_AMOUNT, player.balance);
        return {
            balanceChange: -tax,
            message: `Paid ${tax} in USDC taxes`,
            effectType: 'debit',
            requiresChoice: false,
        };
    }

    // ═════════════════════════════════════════════════════
    // EVENT TILES (Chance, Chest, Meme, Flat reward)
    // ═════════════════════════════════════════════════════
    if (actionType === 'event') {
        // Community Chest tiles (2, 17, 33)
        if (CHEST_TILES.includes(tileIndex)) {
            const result = applyChestCard(die2);
            // Special: chest card 5 sends to liquidation
            if (die2 === 5) {
                const liqResult = applyLiquidation(player);
                return {
                    ...liqResult,
                    message: `Chest: ${result.message} ${liqResult.message}`,
                };
            }
            return { ...result, message: `Chest: ${result.message}` };
        }

        // Chance tiles (7, 27)
        if (CHANCE_TILES.includes(tileIndex)) {
            const result = applyChanceCard(die1, player);
            // Handle "Network Upgrade" (die1 === 4) — find nearest RPC
            if (die1 === 4) {
                let nearestRPC: number;
                if (currentPosition < 5 || currentPosition >= 35) nearestRPC = 5;
                else if (currentPosition < 15) nearestRPC = 15;
                else if (currentPosition < 25) nearestRPC = 25;
                else nearestRPC = 35;
                result.newPosition = nearestRPC;
                result.message = `Chance: Network Upgrade! Move to RPC tile ${nearestRPC}`;
            }
            // Handle "Scholarship" (die1 === 5) — find nearest school
            if (die1 === 5) {
                const school = currentPosition <= 37 ? 37 : 38;
                result.newPosition = school;
                result.message = `Chance: Conference Scholarship! Move to School tile ${school} and +${SCHOOL_BONUS}`;
            }
            return { ...result, message: result.message.startsWith('Chance:') ? result.message : `Chance: ${result.message}` };
        }

        // pump.fun (tile 32) — volatile
        if (tileIndex === TILE_PUMP_FUN) {
            const totalRoll = die1 + die2;
            if (die1 > 3) {
                const gain = totalRoll * 30;
                return {
                    balanceChange: gain,
                    message: `pump.fun MOON! +${gain}`,
                    effectType: 'credit',
                    requiresChoice: false,
                };
            } else {
                const loss = totalRoll * 25;
                return {
                    balanceChange: -loss,
                    message: `pump.fun RUG! -${loss}`,
                    effectType: 'debit',
                    requiresChoice: false,
                };
            }
        }

        // Solana Conf (tile 34) — flat reward
        if (tileIndex === TILE_SOLANA_CONF) {
            return {
                balanceChange: 500,
                message: 'Solana Conf reward: +500!',
                effectType: 'credit',
                requiresChoice: false,
            };
        }

        // Fallback for other event tiles
        return {
            balanceChange: 0,
            message: 'Event tile',
            effectType: 'neutral',
            requiresChoice: false,
        };
    }

    // ═════════════════════════════════════════════════════
    // RISK (MEV Bot / MEV Sandwich)
    // ═════════════════════════════════════════════════════
    if (actionType === 'risk') {
        if (player.hasShield) {
            return {
                balanceChange: 0,
                message: 'Arcium Shield protected you from MEV attack! (Shield consumed)',
                effectType: 'neutral',
                requiresChoice: false,
                stateChanges: { hasShield: false },
            };
        }
        const penalty = Math.floor(player.balance * MEV_PENALTY_BPS / 10000);
        return {
            balanceChange: -penalty,
            message: `MEV attack! Lost ${penalty} (10% of balance)`,
            effectType: 'debit',
            requiresChoice: false,
        };
    }

    // ═════════════════════════════════════════════════════
    // PRIVACY (Arcium = tile 12) — buy shield
    // ═════════════════════════════════════════════════════
    if (actionType === 'privacy') {
        if (player.hasShield) {
            return {
                balanceChange: 0,
                message: 'You already have a Privacy Shield!',
                effectType: 'neutral',
                requiresChoice: false,
            };
        }
        return {
            balanceChange: 0,
            message: 'Arcium Privacy Protocol — buy a shield to protect from MEV attacks',
            effectType: 'choice',
            requiresChoice: true,
            choiceOptions: [{
                id: 'buy_shield',
                label: `Buy Shield (${SHIELD_COST})`,
                cost: SHIELD_COST,
                icon: '🛡️',
                description: 'Blocks one MEV attack',
            }],
        };
    }

    // ═════════════════════════════════════════════════════
    // DEFI — Stake or earn yield / pay landing fee
    // ═════════════════════════════════════════════════════
    if (actionType === 'defi') {
        if (player.hasStakedDefi) {
            return {
                balanceChange: DEFI_LANDING_YIELD,
                message: `DeFi yield! +${DEFI_LANDING_YIELD} from staking position`,
                effectType: 'credit',
                requiresChoice: false,
            };
        }
        // Not staked — offer choice to stake or pay fee
        return {
            balanceChange: -DEFI_LANDING_FEE,
            message: `${tile.project_name} — stake to earn yield, or pay ${DEFI_LANDING_FEE} landing fee`,
            effectType: 'choice',
            requiresChoice: true,
            choiceOptions: [{
                id: 'stake_defi',
                label: `Stake (${DEFI_STAKE_COST})`,
                cost: DEFI_STAKE_COST,
                icon: '📈',
                description: `Earn ${DEFI_LANDING_YIELD} on every DeFi landing`,
            }],
        };
    }

    // ═════════════════════════════════════════════════════
    // NEUTRAL (School tiles)
    // ═════════════════════════════════════════════════════
    if (actionType === 'neutral') {
        if (SCHOOL_TILES.includes(tileIndex)) {
            return {
                balanceChange: SCHOOL_BONUS,
                message: `Solana School! Learned something new. +${SCHOOL_BONUS}`,
                effectType: 'credit',
                requiresChoice: false,
            };
        }
        return {
            balanceChange: 0,
            message: 'Neutral tile. No effect.',
            effectType: 'neutral',
            requiresChoice: false,
        };
    }

    // ═════════════════════════════════════════════════════
    // GOVERNANCE — small voting reward
    // ═════════════════════════════════════════════════════
    if (actionType === 'governance') {
        return {
            balanceChange: GOVERNANCE_BONUS,
            message: `Participated in governance voting! +${GOVERNANCE_BONUS}`,
            effectType: 'credit',
            requiresChoice: false,
        };
    }

    // Fallback
    return {
        balanceChange: 0,
        message: 'No action',
        effectType: 'neutral',
        requiresChoice: false,
    };
}
