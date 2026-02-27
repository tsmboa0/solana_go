import type { Tile } from '../types/game';

import solflareLogo from '../assets/projects_logo/solflare-logo.svg';
import phantomLogo from '../assets/projects_logo/phantom-logo.jpg';
import usdcLogo from '../assets/projects_logo/usdc-logo.png';
import heliusLogo from '../assets/projects_logo/helius-logo.jpg';
import jupiterLogo from '../assets/projects_logo/jupiter-logo.webp';
import kaminoLogo from '../assets/projects_logo/kamino-logo.jpg';
import seekerLogo from '../assets/projects_logo/seeker-logo.jpg';

import madladsLogo from '../assets/projects_logo/madlads-nft.jpg';
import arciumLogo from '../assets/projects_logo/arcium-logo.jpg';
import squadsLogo from '../assets/projects_logo/squads-logo.jpg'; // Using for Tensor placeholder
import driftLogo from '../assets/projects_logo/drift-protocol-logo.png';
import tritonLogo from '../assets/projects_logo/triton-one-logo.jpg';
import meLogo from '../assets/projects_logo/ME_logo.webp';
import exchangeArtLogo from '../assets/projects_logo/exchange-art-logo.jpg';
import marinadeLogo from '../assets/projects_logo/marinade-logo.jpg';

import backpackLogo from '../assets/projects_logo/backpack-logo.svg';
import ledgerLogo from '../assets/projects_logo/ledger-logo.jpg';
import quicknodeLogo from '../assets/projects_logo/quicknode-logo.jpg';
import meteoraLogo from '../assets/projects_logo/meteora-logo.svg';
import playSolanaLogo from '../assets/projects_logo/play-solana-logo.jpg';
import turbineLogo from '../assets/projects_logo/solana-turbine-logo.jpg';

import pumpLogo from '../assets/projects_logo/pump-logo.svg';
import eventLogo from '../assets/projects_logo/solana-event-logo.jpg';
import alchemyLogo from '../assets/projects_logo/alchemy-logo.jpg';
import blueshiftLogo from '../assets/projects_logo/blueshift-logo.jpg';
import bioDaoLogo from '../assets/projects_logo/bio-dao-logo.jpg';
import validatorLogo from '../assets/projects_logo/validator-node.png';
import gologo from '../assets/projects_logo/go-image.webp';
import magicBlockLogo from '../assets/projects_logo/magicblock-logo.jpg';

export const TILES: Tile[] = [
    // 🟢 Bottom Row (0–9) — Early Game Growth
    {
        tile_index: 0,
        project_name: "Send It",
        description: "Represents validator rewards and network epoch settlements.",
        game_description: "Players receive staking rewards and yield from active DeFi positions.",
        type: "corner",
        color_group: null,
        is_ownable: false,
        is_upgradable: false,
        is_gain: true,
        owner: "Not ownable",
        image_url: gologo,
        tile_function: {
            action_type: "corner",
            corner_type: "go"
        },
        available_actions: [
            {
                id: "acknowledge",
                label: "Continue",
                action_type: "continue",
                requires_input: false,
                is_primary: true,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 1,
        project_name: "Solflare",
        description: "The secure and powerful Solana wallet.",
        game_description: "Early wallet ownership. Owner collects flat rent.",
        type: "wallet",
        color_group: "brown",
        is_ownable: true,
        is_upgradable: false,
        is_gain: false,
        owner: "Not ownable",
        image_url: solflareLogo,
        tile_function: {
            action_type: "ownable",
            buy_price: 60,
            base_fee: 10,
            rent_formula: "flat",
            rent_value: 20
        },
        available_actions: [
            {
                id: "buy_wallet",
                label: "Buy Wallet",
                action_type: "buy",
                requires_input: false,
                is_primary: true,
                visibility_condition: "tile.owner == null"
            },
            {
                id: "skip",
                label: "Skip",
                action_type: "continue",
                requires_input: false,
                is_primary: false,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 2,
        project_name: "Community Chest",
        description: "A community reward or penalty.",
        game_description: "Draw a community chest event card.",
        type: "chest",
        color_group: null,
        is_ownable: false,
        is_upgradable: false,
        is_gain: false,
        owner: "Not ownable",
        image_url: "",
        tile_function: {
            action_type: "event",
            reward_type: "random",
            reward_value: 0
        },
        available_actions: [
            {
                id: "acknowledge",
                label: "Continue",
                action_type: "continue",
                requires_input: false,
                is_primary: true,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 3,
        project_name: "Phantom",
        description: "A friendly, easy-to-use crypto wallet.",
        game_description: "Early wallet ownership. Owner collects flat rent.",
        type: "wallet",
        color_group: "brown",
        is_ownable: true,
        is_upgradable: false,
        is_gain: false,
        owner: "Not ownable",
        image_url: phantomLogo,
        tile_function: {
            action_type: "ownable",
            buy_price: 60,
            base_fee: 10,
            rent_formula: "flat",
            rent_value: 20
        },
        available_actions: [
            {
                id: "buy_wallet",
                label: "Buy Wallet",
                action_type: "buy",
                requires_input: false,
                is_primary: true,
                visibility_condition: "tile.owner == null"
            },
            {
                id: "skip",
                label: "Skip",
                action_type: "continue",
                requires_input: false,
                is_primary: false,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 4,
        project_name: "USDC Tax",
        description: "Stablecoin tax event.",
        game_description: "Pay standard transaction taxes.",
        type: "stablecoin",
        color_group: null,
        is_ownable: false,
        is_upgradable: false,
        is_gain: false,
        owner: "Not ownable",
        image_url: usdcLogo,
        tile_function: {
            action_type: "risk",
            penalty_type: "flat",
            penalty_value: 200,
            can_be_protected: false
        },
        available_actions: [
            {
                id: "acknowledge",
                label: "Continue",
                action_type: "continue",
                requires_input: false,
                is_primary: true,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 5,
        project_name: "Helius",
        description: "Solana RPC and developer infrastructure provider.",
        game_description: "Players pay transaction routing fees. Owner earns rent when others land.",
        type: "rpc",
        color_group: "green",
        is_ownable: true,
        is_upgradable: false,
        is_gain: false,
        owner: "Not ownable",
        image_url: heliusLogo,
        tile_function: {
            action_type: "ownable",
            buy_price: 300,
            base_fee: 25,
            rent_formula: "owned_count_multiplier",
            rent_value: 25
        },
        available_actions: [
            {
                id: "buy_rpc",
                label: "Buy RPC",
                action_type: "buy",
                requires_input: false,
                is_primary: true,
                visibility_condition: "tile.owner == null"
            },
            {
                id: "skip",
                label: "Skip",
                action_type: "continue",
                requires_input: false,
                is_primary: false,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 6,
        project_name: "Jupiter",
        description: "Solana's leading DEX aggregator for token swaps.",
        game_description: "Players can swap assets and provide liquidity to earn yield each epoch.",
        type: "defi",
        color_group: "purple",
        is_ownable: false,
        is_upgradable: false,
        is_gain: true,
        owner: "Not ownable",
        image_url: jupiterLogo,
        tile_function: {
            action_type: "defi",
            landing_fee: 10,
            can_stake: false,
            can_borrow: false,
            can_provide_liquidity: true,
            can_swap: true,
            epoch_yield_rate: 0.04
        },
        available_actions: [
            {
                id: "swap_assets",
                label: "Swap",
                action_type: "swap",
                requires_input: true,
                is_primary: true,
                visibility_condition: "true"
            },
            {
                id: "provide_liquidity",
                label: "Provide Liquidity",
                action_type: "provide_liquidity",
                requires_input: true,
                is_primary: false,
                visibility_condition: "true"
            },
            {
                id: "skip",
                label: "Skip",
                action_type: "continue",
                requires_input: false,
                is_primary: false,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 7,
        project_name: "Magic Card",
        description: "Take a risk, reap the reward or suffer the consequence.",
        game_description: "Draw a chance event card.",
        type: "chance",
        color_group: null,
        is_ownable: false,
        is_upgradable: false,
        is_gain: false,
        owner: "Not ownable",
        image_url: magicBlockLogo,
        tile_function: {
            action_type: "event",
            reward_type: "random",
            reward_value: 0
        },
        available_actions: [
            {
                id: "acknowledge",
                label: "Continue",
                action_type: "continue",
                requires_input: false,
                is_primary: true,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 8,
        project_name: "Kamino",
        description: "Automated liquidity and lending protocol.",
        game_description: "Earn yield or borrow assets for leverage.",
        type: "defi",
        color_group: "purple",
        is_ownable: false,
        is_upgradable: false,
        is_gain: true,
        owner: "Not ownable",
        image_url: kaminoLogo,
        tile_function: {
            action_type: "defi",
            landing_fee: 15,
            can_stake: true,
            can_borrow: true,
            can_provide_liquidity: true,
            can_swap: false,
            epoch_yield_rate: 0.05
        },
        available_actions: [
            {
                id: "stake_assets",
                label: "Stake",
                action_type: "stake",
                requires_input: true,
                is_primary: true,
                visibility_condition: "player.balance > 0"
            },
            {
                id: "borrow_assets",
                label: "Borrow",
                action_type: "borrow",
                requires_input: true,
                is_primary: false,
                visibility_condition: "player.collateral_value > 0"
            },
            {
                id: "skip",
                label: "Skip",
                action_type: "continue",
                requires_input: false,
                is_primary: false,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 9,
        project_name: "Solana Seeker",
        description: "Solana mobile hardware.",
        game_description: "Utility. Rent depends on dice roll multiplier.",
        type: "utility",
        color_group: "yellow",
        is_ownable: true,
        is_upgradable: false,
        is_gain: false,
        owner: "Not ownable",
        image_url: seekerLogo,
        tile_function: {
            action_type: "ownable",
            buy_price: 150,
            base_fee: 10,
            rent_formula: "owned_count_multiplier",
            rent_value: 10
        },
        available_actions: [
            {
                id: "buy_utility",
                label: "Buy Utility",
                action_type: "buy",
                requires_input: false,
                is_primary: true,
                visibility_condition: "tile.owner == null"
            },
            {
                id: "skip",
                label: "Skip",
                action_type: "continue",
                requires_input: false,
                is_primary: false,
                visibility_condition: "true"
            }
        ]
    },

    // 🟠 Left Side (10–19) — Hot Post-Graveyard Zone
    {
        tile_index: 10,
        project_name: "Graveyard",
        description: "Just visiting or trapped in the graveyard.",
        game_description: "Safe zone unless forced here.",
        type: "corner",
        color_group: null,
        is_ownable: false,
        is_upgradable: false,
        is_gain: false,
        owner: "Not ownable",
        image_url: "",
        tile_function: {
            action_type: "corner",
            corner_type: "graveyard"
        },
        available_actions: [
            {
                id: "acknowledge",
                label: "Continue",
                action_type: "continue",
                requires_input: false,
                is_primary: true,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 11,
        project_name: "Mad Lads",
        description: "A prominent Solana NFT collection.",
        game_description: "Premium NFT tile. Owner collects royalty-style rent.",
        type: "nft",
        color_group: "orange",
        is_ownable: true,
        is_upgradable: false,
        is_gain: false,
        owner: "Not ownable",
        image_url: madladsLogo,
        tile_function: {
            action_type: "ownable",
            buy_price: 500,
            base_fee: 50,
            rent_formula: "flat",
            rent_value: 75
        },
        available_actions: [
            {
                id: "buy_nft",
                label: "Buy NFT",
                action_type: "buy",
                requires_input: false,
                is_primary: true,
                visibility_condition: "tile.owner == null"
            },
            {
                id: "skip",
                label: "Skip",
                action_type: "continue",
                requires_input: false,
                is_primary: false,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 12,
        project_name: "Arcium",
        description: "Confidential computing and privacy network.",
        game_description: "Purchase privacy shields to protect against MEV attacks.",
        type: "privacy",
        color_group: "purple",
        is_ownable: false,
        is_upgradable: false,
        is_gain: true,
        owner: "Not ownable",
        image_url: arciumLogo,
        tile_function: {
            action_type: "privacy",
            shield_cost: 200,
            shield_duration_epochs: 3
        },
        available_actions: [
            {
                id: "buy_shield",
                label: "Buy Shield",
                action_type: "buy",
                requires_input: false,
                is_primary: true,
                visibility_condition: "true"
            },
            {
                id: "skip",
                label: "Skip",
                action_type: "continue",
                requires_input: false,
                is_primary: false,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 13,
        project_name: "Tensor",
        description: "Pro NFT trading protocol.",
        game_description: "Premium NFT tile. Owner collects royalty-style rent.",
        type: "nft",
        color_group: "orange",
        is_ownable: true,
        is_upgradable: false,
        is_gain: false,
        owner: "Not ownable",
        image_url: squadsLogo, // Placeholder
        tile_function: {
            action_type: "ownable",
            buy_price: 550,
            base_fee: 60,
            rent_formula: "flat",
            rent_value: 80
        },
        available_actions: [
            {
                id: "buy_nft",
                label: "Buy NFT",
                action_type: "buy",
                requires_input: false,
                is_primary: true,
                visibility_condition: "tile.owner == null"
            },
            {
                id: "skip",
                label: "Skip",
                action_type: "continue",
                requires_input: false,
                is_primary: false,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 14,
        project_name: "Drift Protocol",
        description: "Perpetual futures DEX on Solana.",
        game_description: "Leverage trading. Chance for high yield or high loss.",
        type: "defi",
        color_group: "purple",
        is_ownable: false,
        is_upgradable: false,
        is_gain: true,
        owner: "Not ownable",
        image_url: driftLogo,
        tile_function: {
            action_type: "defi",
            landing_fee: 20,
            can_stake: true,
            can_borrow: false,
            can_provide_liquidity: false,
            can_swap: false,
            epoch_yield_rate: 0.08
        },
        available_actions: [
            {
                id: "stake_assets",
                label: "Stake",
                action_type: "stake",
                requires_input: true,
                is_primary: true,
                visibility_condition: "player.balance > 0"
            },
            {
                id: "skip",
                label: "Skip",
                action_type: "continue",
                requires_input: false,
                is_primary: false,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 15,
        project_name: "Triton One",
        description: "High-performance bare metal RPC infrastructure.",
        game_description: "Players pay transaction routing fees. Owner earns rent.",
        type: "rpc",
        color_group: "green",
        is_ownable: true,
        is_upgradable: false,
        is_gain: false,
        owner: "Not ownable",
        image_url: tritonLogo,
        tile_function: {
            action_type: "ownable",
            buy_price: 300,
            base_fee: 25,
            rent_formula: "owned_count_multiplier",
            rent_value: 25
        },
        available_actions: [
            {
                id: "buy_rpc",
                label: "Buy RPC",
                action_type: "buy",
                requires_input: false,
                is_primary: true,
                visibility_condition: "tile.owner == null"
            },
            {
                id: "skip",
                label: "Skip",
                action_type: "continue",
                requires_input: false,
                is_primary: false,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 16,
        project_name: "Magic Eden",
        description: "The leading cross-chain NFT marketplace.",
        game_description: "Premium NFT tile. Owner collects royalty-style rent.",
        type: "nft",
        color_group: "orange",
        is_ownable: true,
        is_upgradable: false,
        is_gain: false,
        owner: "Not ownable",
        image_url: meLogo,
        tile_function: {
            action_type: "ownable",
            buy_price: 600,
            base_fee: 70,
            rent_formula: "flat",
            rent_value: 100
        },
        available_actions: [
            {
                id: "buy_nft",
                label: "Buy NFT",
                action_type: "buy",
                requires_input: false,
                is_primary: true,
                visibility_condition: "tile.owner == null"
            },
            {
                id: "skip",
                label: "Skip",
                action_type: "continue",
                requires_input: false,
                is_primary: false,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 17,
        project_name: "Magic Chest",
        description: "A community reward or penalty.",
        game_description: "Draw a community chest event card.",
        type: "chest",
        color_group: null,
        is_ownable: false,
        is_upgradable: false,
        is_gain: false,
        owner: "Not ownable",
        image_url: magicBlockLogo,
        tile_function: {
            action_type: "event",
            reward_type: "random",
            reward_value: 0
        },
        available_actions: [
            {
                id: "acknowledge",
                label: "Continue",
                action_type: "continue",
                requires_input: false,
                is_primary: true,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 18,
        project_name: "Exchange Art",
        description: "Fine art marketplace on Solana.",
        game_description: "Premium NFT tile. Owner collects royalty-style rent.",
        type: "nft",
        color_group: "orange",
        is_ownable: true,
        is_upgradable: false,
        is_gain: false,
        owner: "Not ownable",
        image_url: exchangeArtLogo,
        tile_function: {
            action_type: "ownable",
            buy_price: 650,
            base_fee: 80,
            rent_formula: "flat",
            rent_value: 110
        },
        available_actions: [
            {
                id: "buy_nft",
                label: "Buy NFT",
                action_type: "buy",
                requires_input: false,
                is_primary: true,
                visibility_condition: "tile.owner == null"
            },
            {
                id: "skip",
                label: "Skip",
                action_type: "continue",
                requires_input: false,
                is_primary: false,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 19,
        project_name: "Marinade",
        description: "Stake automation platform for Solana.",
        game_description: "Automate liquid staking for regular yield.",
        type: "defi",
        color_group: "purple",
        is_ownable: false,
        is_upgradable: false,
        is_gain: true,
        owner: "Not ownable",
        image_url: marinadeLogo,
        tile_function: {
            action_type: "defi",
            landing_fee: 25,
            can_stake: true,
            can_borrow: false,
            can_provide_liquidity: false,
            can_swap: false,
            epoch_yield_rate: 0.05
        },
        available_actions: [
            {
                id: "stake_assets",
                label: "Stake",
                action_type: "stake",
                requires_input: true,
                is_primary: true,
                visibility_condition: "player.balance > 0"
            },
            {
                id: "skip",
                label: "Skip",
                action_type: "continue",
                requires_input: false,
                is_primary: false,
                visibility_condition: "true"
            }
        ]
    },

    // 🔵 Top Row (20–29) — Strategic Control Zone
    {
        tile_index: 20,
        project_name: "Grant",
        description: "Foundation grant program.",
        game_description: "Free parking and occasional ecosystem grants.",
        type: "corner",
        color_group: null,
        is_ownable: false,
        is_upgradable: false,
        is_gain: true,
        owner: "Not ownable",
        image_url: "",
        tile_function: {
            action_type: "corner",
            corner_type: "grant"
        },
        available_actions: [
            {
                id: "acknowledge",
                label: "Continue",
                action_type: "continue",
                requires_input: false,
                is_primary: true,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 21,
        project_name: "Backpack",
        description: "The next-generation crypto exchange and wallet.",
        game_description: "Mid-tier wallet ownership.",
        type: "wallet",
        color_group: "light_blue",
        is_ownable: true,
        is_upgradable: false,
        is_gain: false,
        owner: "Not ownable",
        image_url: backpackLogo,
        tile_function: {
            action_type: "ownable",
            buy_price: 200,
            base_fee: 30,
            rent_formula: "flat",
            rent_value: 50
        },
        available_actions: [
            {
                id: "buy_wallet",
                label: "Buy Wallet",
                action_type: "buy",
                requires_input: false,
                is_primary: true,
                visibility_condition: "tile.owner == null"
            },
            {
                id: "skip",
                label: "Skip",
                action_type: "continue",
                requires_input: false,
                is_primary: false,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 22,
        project_name: "MEV Bot",
        description: "Represents front-running and sandwich attacks in DeFi.",
        game_description: "Lose funds unless protected by Arcium shield.",
        type: "risk",
        color_group: "grey",
        is_ownable: false,
        is_upgradable: false,
        is_gain: false,
        owner: "Not ownable",
        image_url: "",
        tile_function: {
            action_type: "risk",
            penalty_type: "percentage",
            penalty_value: 0.1,
            can_be_protected: true,
            protection_source: "Arcium Shield"
        },
        available_actions: [
            {
                id: "continue_after_penalty",
                label: "Continue",
                action_type: "continue",
                requires_input: false,
                is_primary: true,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 23,
        project_name: "Ledger",
        description: "Hardware wallet for secure self-custody.",
        game_description: "Mid-tier wallet ownership.",
        type: "wallet",
        color_group: "light_blue",
        is_ownable: true,
        is_upgradable: false,
        is_gain: false,
        owner: "Not ownable",
        image_url: ledgerLogo,
        tile_function: {
            action_type: "ownable",
            buy_price: 220,
            base_fee: 35,
            rent_formula: "flat",
            rent_value: 55
        },
        available_actions: [
            {
                id: "buy_wallet",
                label: "Buy Wallet",
                action_type: "buy",
                requires_input: false,
                is_primary: true,
                visibility_condition: "tile.owner == null"
            },
            {
                id: "skip",
                label: "Skip",
                action_type: "continue",
                requires_input: false,
                is_primary: false,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 24,
        project_name: "Governance",
        description: "Represents Solana DAO governance and protocol voting.",
        game_description: "Triggers a vote. If over 50% quorum, rule changes apply next epoch.",
        type: "governance",
        color_group: "grey",
        is_ownable: false,
        is_upgradable: false,
        is_gain: true,
        owner: "Not ownable",
        image_url: "",
        tile_function: {
            action_type: "governance",
            quorum_percentage: 50,
            possible_proposals: [
                "Increase DeFi yield",
                "Increase grant pool",
                "Double MEV damage",
                "Reduce RPC rent"
            ],
            effect_duration_epochs: 1
        },
        available_actions: [
            {
                id: "vote_yes",
                label: "Vote Yes",
                action_type: "vote",
                requires_input: false,
                is_primary: true,
                visibility_condition: "!player.has_voted_this_epoch"
            },
            {
                id: "vote_no",
                label: "Vote No",
                action_type: "vote",
                requires_input: false,
                is_primary: false,
                visibility_condition: "!player.has_voted_this_epoch"
            },
            {
                id: "skip",
                label: "Skip",
                action_type: "continue",
                requires_input: false,
                is_primary: false,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 25,
        project_name: "QuickNode",
        description: "Global blockchain infrastructure.",
        game_description: "Players pay transaction routing fees. Owner earns rent.",
        type: "rpc",
        color_group: "green",
        is_ownable: true,
        is_upgradable: false,
        is_gain: false,
        owner: "Not ownable",
        image_url: quicknodeLogo,
        tile_function: {
            action_type: "ownable",
            buy_price: 300,
            base_fee: 25,
            rent_formula: "owned_count_multiplier",
            rent_value: 25
        },
        available_actions: [
            {
                id: "buy_rpc",
                label: "Buy RPC",
                action_type: "buy",
                requires_input: false,
                is_primary: true,
                visibility_condition: "tile.owner == null"
            },
            {
                id: "skip",
                label: "Skip",
                action_type: "continue",
                requires_input: false,
                is_primary: false,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 26,
        project_name: "Meteora",
        description: "Dynamic liquidity protocol for Solana.",
        game_description: "Provide liquidity to earn dynamic yield.",
        type: "defi",
        color_group: "purple",
        is_ownable: false,
        is_upgradable: false,
        is_gain: true,
        owner: "Not ownable",
        image_url: meteoraLogo,
        tile_function: {
            action_type: "defi",
            landing_fee: 30,
            can_stake: false,
            can_borrow: false,
            can_provide_liquidity: true,
            can_swap: false,
            epoch_yield_rate: 0.06
        },
        available_actions: [
            {
                id: "provide_liquidity",
                label: "Provide Liquidity",
                action_type: "provide_liquidity",
                requires_input: true,
                is_primary: true,
                visibility_condition: "true"
            },
            {
                id: "skip",
                label: "Skip",
                action_type: "continue",
                requires_input: false,
                is_primary: false,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 27,
        project_name: "Magic Card",
        description: "Take a risk, reap the reward or suffer the consequence.",
        game_description: "Draw a chance event card.",
        type: "chance",
        color_group: null,
        is_ownable: false,
        is_upgradable: false,
        is_gain: false,
        owner: "Not ownable",
        image_url: magicBlockLogo,
        tile_function: {
            action_type: "event",
            reward_type: "random",
            reward_value: 0
        },
        available_actions: [
            {
                id: "acknowledge",
                label: "Continue",
                action_type: "continue",
                requires_input: false,
                is_primary: true,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 28,
        project_name: "Play Solana Game",
        description: "Web3 gaming ecosystem.",
        game_description: "Utility tile. Owner collects multiplied rent.",
        type: "utility",
        color_group: "yellow",
        is_ownable: true,
        is_upgradable: false,
        is_gain: false,
        owner: "Not ownable",
        image_url: playSolanaLogo,
        tile_function: {
            action_type: "ownable",
            buy_price: 150,
            base_fee: 10,
            rent_formula: "owned_count_multiplier",
            rent_value: 10
        },
        available_actions: [
            {
                id: "buy_utility",
                label: "Buy Utility",
                action_type: "buy",
                requires_input: false,
                is_primary: true,
                visibility_condition: "tile.owner == null"
            },
            {
                id: "skip",
                label: "Skip",
                action_type: "continue",
                requires_input: false,
                is_primary: false,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 29,
        project_name: "Validator Node A",
        description: "Crucial network infrastructure validation.",
        game_description: "High-value property. Owner earns substantial rent.",
        type: "validator",
        color_group: "light_blue",
        is_ownable: true,
        is_upgradable: true,
        is_gain: false,
        owner: "Not ownable",
        image_url: validatorLogo,
        tile_function: {
            action_type: "ownable",
            buy_price: 800,
            base_fee: 100,
            rent_formula: "flat",
            rent_value: 150,
            upgrade_cost: 500
        },
        available_actions: [
            {
                id: "buy_validator",
                label: "Buy Validator",
                action_type: "buy",
                requires_input: false,
                is_primary: true,
                visibility_condition: "tile.owner == null"
            },
            {
                id: "upgrade_node",
                label: "Upgrade Node",
                action_type: "upgrade",
                requires_input: false,
                is_primary: false,
                visibility_condition: "tile.owner == player.id"
            },
            {
                id: "skip",
                label: "Skip",
                action_type: "continue",
                requires_input: false,
                is_primary: false,
                visibility_condition: "true"
            }
        ]
    },

    // 🔴 Right Side (30–39) — High Risk / Late Game
    {
        tile_index: 30,
        project_name: "Liquidation",
        description: "Market crashed. Assets liquidated.",
        game_description: "Go straight to graveyard or pay heavy penalty.",
        type: "corner",
        color_group: null,
        is_ownable: false,
        is_upgradable: false,
        is_gain: false,
        owner: "Not ownable",
        image_url: "",
        tile_function: {
            action_type: "corner",
            corner_type: "liquidation"
        },
        available_actions: [
            {
                id: "acknowledge",
                label: "Continue",
                action_type: "continue",
                requires_input: false,
                is_primary: true,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 31,
        project_name: "Validator Node B",
        description: "Core network validation.",
        game_description: "High-value property. Owner earns substantial rent.",
        type: "validator",
        color_group: "red",
        is_ownable: true,
        is_upgradable: true,
        is_gain: false,
        owner: "Not ownable",
        image_url: validatorLogo,
        tile_function: {
            action_type: "ownable",
            buy_price: 850,
            base_fee: 110,
            rent_formula: "flat",
            rent_value: 160,
            upgrade_cost: 500
        },
        available_actions: [
            {
                id: "buy_validator",
                label: "Buy Validator",
                action_type: "buy",
                requires_input: false,
                is_primary: true,
                visibility_condition: "tile.owner == null"
            },
            {
                id: "upgrade_node",
                label: "Upgrade Node",
                action_type: "upgrade",
                requires_input: false,
                is_primary: false,
                visibility_condition: "tile.owner == player.id"
            },
            {
                id: "skip",
                label: "Skip",
                action_type: "continue",
                requires_input: false,
                is_primary: false,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 32,
        project_name: "pump.fun",
        description: "Meme coin casino and launchpad.",
        game_description: "High risk meme trading. Volatile returns.",
        type: "meme",
        color_group: "red",
        is_ownable: false,
        is_upgradable: false,
        is_gain: false,
        owner: "Not ownable",
        image_url: pumpLogo,
        tile_function: {
            action_type: "event",
            reward_type: "random",
            reward_value: 0
        },
        available_actions: [
            {
                id: "acknowledge",
                label: "Continue",
                action_type: "continue",
                requires_input: false,
                is_primary: true,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 33,
        project_name: "Magic Chest",
        description: "A community reward or penalty.",
        game_description: "Draw a community chest event card.",
        type: "chest",
        color_group: null,
        is_ownable: false,
        is_upgradable: false,
        is_gain: false,
        owner: "Not ownable",
        image_url: magicBlockLogo,
        tile_function: {
            action_type: "event",
            reward_type: "random",
            reward_value: 0
        },
        available_actions: [
            {
                id: "acknowledge",
                label: "Continue",
                action_type: "continue",
                requires_input: false,
                is_primary: true,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 34,
        project_name: "Solana Conf",
        description: "Global hacker house and builder event.",
        game_description: "Event tile. Potential to meet investors.",
        type: "event",
        color_group: null,
        is_ownable: false,
        is_upgradable: false,
        is_gain: true,
        owner: "Not ownable",
        image_url: eventLogo,
        tile_function: {
            action_type: "event",
            reward_type: "flat",
            reward_value: 500
        },
        available_actions: [
            {
                id: "acknowledge",
                label: "Continue",
                action_type: "continue",
                requires_input: false,
                is_primary: true,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 35,
        project_name: "Alchemy",
        description: "Enterprise-grade web3 development platform.",
        game_description: "Players pay transaction routing fees. Owner earns rent.",
        type: "rpc",
        color_group: "green",
        is_ownable: true,
        is_upgradable: false,
        is_gain: false,
        owner: "Not ownable",
        image_url: alchemyLogo,
        tile_function: {
            action_type: "ownable",
            buy_price: 300,
            base_fee: 25,
            rent_formula: "owned_count_multiplier",
            rent_value: 25
        },
        available_actions: [
            {
                id: "buy_rpc",
                label: "Buy RPC",
                action_type: "buy",
                requires_input: false,
                is_primary: true,
                visibility_condition: "tile.owner == null"
            },
            {
                id: "skip",
                label: "Skip",
                action_type: "continue",
                requires_input: false,
                is_primary: false,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 36,
        project_name: "MEV Sandwich",
        description: "Devastating MEV sandwich attack.",
        game_description: "Heavy penalty unless protected.",
        type: "risk",
        color_group: "grey",
        is_ownable: false,
        is_upgradable: false,
        is_gain: false,
        owner: "Not ownable",
        image_url: "",
        tile_function: {
            action_type: "risk",
            penalty_type: "flat",
            penalty_value: 1000,
            can_be_protected: true,
            protection_source: "Arcium Shield"
        },
        available_actions: [
            {
                id: "continue_after_penalty",
                label: "Continue",
                action_type: "continue",
                requires_input: false,
                is_primary: true,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 37,
        project_name: "Blueshift",
        description: "A portfolio management system.",
        game_description: "Neutral zone.",
        type: "neutral",
        color_group: "grey",
        is_ownable: false,
        is_upgradable: false,
        is_gain: false,
        owner: "Not ownable",
        image_url: blueshiftLogo,
        tile_function: {
            action_type: "neutral"
        },
        available_actions: [
            {
                id: "acknowledge",
                label: "Continue",
                action_type: "continue",
                requires_input: false,
                is_primary: true,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 38,
        project_name: "Solana Turbine",
        description: "Network block propagation protocol.",
        game_description: "Neutral system infrastructure.",
        type: "neutral",
        color_group: "grey",
        is_ownable: false,
        is_upgradable: false,
        is_gain: false,
        owner: "Not ownable",
        image_url: turbineLogo,
        tile_function: {
            action_type: "neutral"
        },
        available_actions: [
            {
                id: "acknowledge",
                label: "Continue",
                action_type: "continue",
                requires_input: false,
                is_primary: true,
                visibility_condition: "true"
            }
        ]
    },
    {
        tile_index: 39,
        project_name: "DeSci",
        description: "Decentralized Science funding and curation.",
        game_description: "Endgame funding mechanism.",
        type: "desci",
        color_group: "dark_blue",
        is_ownable: true,
        is_upgradable: false,
        is_gain: false,
        owner: "Not ownable",
        image_url: bioDaoLogo,
        tile_function: {
            action_type: "ownable",
            buy_price: 1000,
            base_fee: 150,
            rent_formula: "flat",
            rent_value: 200
        },
        available_actions: [
            {
                id: "acknowledge",
                label: "Continue",
                action_type: "continue",
                requires_input: false,
                is_primary: true,
                visibility_condition: "true"
            }
        ]
    }
];
