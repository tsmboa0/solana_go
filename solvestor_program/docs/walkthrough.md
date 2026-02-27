# Solvestor Anchor Program — Walkthrough (v2)

## Summary

Complete Anchor program for a Monopoly-style game on Solana with **MagicBlock Ephemeral Rollups** (real-time gameplay), **VRF** (dice randomness), and **Session Keys** (auth). Build status: **✅ `anchor build` — 0 errors, 0 warnings**.

## User Flow

```
CREATE ROOM (L1) → DELEGATE (L1) → JOIN + DELEGATE (L1)
    → START GAME (L1 or auto)
    → ROLL_DICE (ER/VRF) → CALLBACK (ER) → PERFORM_TILE_ACTION (ER)
    → [optional: BUY_PROPERTY (ER)]
    → ... repeat ...
    → END_GAME (ER → L1) → SETTLE_GAME (L1, payout)
```

## Files (16 total)

| File | Purpose |
|---|---|
| [lib.rs](file:///Users/tsmboa/dev/solvestor_game/solvestor_program/programs/solvestor_program/src/lib.rs) | 13 instructions wired |
| [state.rs](file:///Users/tsmboa/dev/solvestor_game/solvestor_program/programs/solvestor_program/src/state.rs) | GameState + PlayerState (has_potion, is_in_graveyard) |
| [constants.rs](file:///Users/tsmboa/dev/solvestor_game/solvestor_program/programs/solvestor_program/src/constants.rs) | 40 tile configs, game constants, calculate_rent() |
| [errors.rs](file:///Users/tsmboa/dev/solvestor_game/solvestor_program/programs/solvestor_program/src/errors.rs) | 22 error codes |
| [create_room.rs](file:///Users/tsmboa/dev/solvestor_game/solvestor_program/programs/solvestor_program/src/instructions/create_room.rs) | Init game + escrow + player 1 |
| [start_game.rs](file:///Users/tsmboa/dev/solvestor_game/solvestor_program/programs/solvestor_program/src/instructions/start_game.rs) | Manual early start (min 2 players) |
| [join_room.rs](file:///Users/tsmboa/dev/solvestor_game/solvestor_program/programs/solvestor_program/src/instructions/join_room.rs) | Join + auto-start at max_players |
| [delegate.rs](file:///Users/tsmboa/dev/solvestor_game/solvestor_program/programs/solvestor_program/src/instructions/delegate.rs) | ER delegation (game + player) |
| [roll_dice.rs](file:///Users/tsmboa/dev/solvestor_game/solvestor_program/programs/solvestor_program/src/instructions/roll_dice.rs) | VRF dice + graveyard escape (doubles) |
| [buy_property.rs](file:///Users/tsmboa/dev/solvestor_game/solvestor_program/programs/solvestor_program/src/instructions/buy_property.rs) | Optional tile purchase |
| [pay_rent.rs](file:///Users/tsmboa/dev/solvestor_game/solvestor_program/programs/solvestor_program/src/instructions/pay_rent.rs) | Standalone rent (backup to perform_tile_action) |
| [perform_tile_action.rs](file:///Users/tsmboa/dev/solvestor_game/solvestor_program/programs/solvestor_program/src/instructions/perform_tile_action.rs) | **ALL tile effects** (see below) |
| [leave_room.rs](file:///Users/tsmboa/dev/solvestor_game/solvestor_program/programs/solvestor_program/src/instructions/leave_room.rs) | Exit + forfeit + commit/undelegate |
| [end_game.rs](file:///Users/tsmboa/dev/solvestor_game/solvestor_program/programs/solvestor_program/src/instructions/end_game.rs) | Winner computation + commit/undelegate to L1 |
| [settle_game.rs](file:///Users/tsmboa/dev/solvestor_game/solvestor_program/programs/solvestor_program/src/instructions/settle_game.rs) | L1 payout (95% winner, 5% house) |

## `perform_tile_action` Handles ALL Tiles

| Tile Type | Effect |
|---|---|
| **Ownable (unowned)** | No action (use buy_property separately) |
| **Ownable (self-owned)** | Safe, no action |
| **Ownable (other owns)** | Auto-pay rent via remaining_accounts |
| **DeSci (tile 39)** | Ownable + potion shop (500 for resurrection) |
| **Corner (GO)** | Bonus handled in callback |
| **Corner (Graveyard)** | Just visiting (sent here by cards) |
| **Corner (Grant)** | Random grant 140-340 |
| **Corner (Liquidation)** | Lose DeFi position + 10% + sent to Graveyard |
| **Tax** | -200 |
| **Chance cards** | Airdrop, Advance to GO, Graveyard, Nearest RPC, School, Protocol Hack |
| **Chest cards** | DAO Grant, Bug Bounty, Audit Fee, Grant tile, Liquidation, NFT Royalties |
| **pump.fun** | Moon (die>3: +roll×30) or Rug (die≤3: -roll×25) |
| **Solana Conf** | +500 flat |
| **Risk (MEV)** | Shield? Protected. Else: -10% balance |
| **Privacy (Arcium)** | Buy shield for 200 |
| **DeFi** | Staked? +25 yield. Else: stake (200) or pay 20 fee |
| **School** | +50 bonus |
| **Governance** | +25 voting reward |

## Graveyard Mechanic

- Sent to graveyard by: Liquidation corner, Chance card, or Chest card
- **Has BioDAO potion**: Consumed, just visiting (no penalty)
- **No potion**: Lose 40% balance, trapped (`is_in_graveyard = true`)
- **Escape**: Must roll doubles in callback_roll_dice. Non-doubles = stay trapped

## Build Verification

```
anchor build → ✅ 0 errors, 0 warnings
```

- All `GameState` accounts wrapped in `Box<>` to avoid BPF stack overflow
- VRF discriminator uses `crate::instruction::CallbackRollDice::DISCRIMINATOR`
- Settlement split: `end_game` (ER) → `settle_game` (L1)
