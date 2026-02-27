# Solvestor Program — Test Plan

## Testing Strategy

Since the program integrates **MagicBlock Ephemeral Rollups**, **VRF**, and **Session Keys**, some instructions can only be fully tested on MagicBlock's devnet (not localnet). The test suite is therefore split into two tiers:

### Tier 1: Localnet Tests (anchor test)
These instructions run on a local Solana validator — no ER/VRF dependency:

| Test | Instruction | What's Verified |
|---|---|---|
| Create Room | `create_room` | GameState init, PlayerState init, escrow deposit, PDAs correct |
| Start Game | `start_game` | Creator-only gate, min 2 players check, `is_started` toggle |
| Join Room | `join_room` | Player added, stake deposited, auto-start at max_players |
| Buy Property | `buy_property` | Owner set, balance deducted, ownable-only check, already-owned check |
| Pay Rent | `pay_rent` | Flat rent, multiplier calc, upgrade bonus, balance transfers |
| Perform Tile Action | `perform_tile_action` | All tile types: corners, tax, chance/chest, DeFi, risk, privacy, school, governance, BioDAO potion, graveyard, liquidation |
| Settle Game | `settle_game` | 95%/5% payout split, winner/house receive correct amounts |

### Tier 2: Devnet Tests (MagicBlock devnet)
These require ER and VRF infrastructure:

| Test | Instruction | What's Verified |
|---|---|---|
| Delegate | `delegate_game`, `delegate_player` | Accounts delegated to ER |
| Roll Dice | `roll_dice` + `callback_roll_dice` | VRF request, callback receives randomness, position updated, GO bonus |
| Leave Room | `leave_room` | Commit + undelegate player |
| End Game | `end_game` | Winner computation, commit + undelegate game |

---

## Test File Structure

```
tests/
├── solvestor_program.ts      # Complete Tier 1 test suite (localnet)
└── solvestor_devnet.ts        # Tier 2 ER/VRF tests (devnet, manual)
```

---

## Tier 1 Test Scenarios (Localnet)

### 1. Room Lifecycle
```
✅ create_room — init game with valid config
✅ create_room — PDA derivation is correct
✅ create_room — escrow receives 0.2 SOL
✅ create_room — creator is player[0] with start_capital balance
❌ create_room — invalid max_players (0 or >10)

✅ start_game — creator can start with 2+ players
❌ start_game — non-creator cannot start
❌ start_game — cannot start with only 1 player

✅ join_room — second player joins, player_count = 2
✅ join_room — auto-starts when player_count == max_players
✅ join_room — escrow balance increases by stake_amount
❌ join_room — cannot join full room
❌ join_room — cannot join twice
❌ join_room — cannot join ended game
```

### 2. Property
```
✅ buy_property — buy unowned ownable tile
✅ buy_property — balance deducted, property_owners updated
❌ buy_property — cannot buy non-ownable tile
❌ buy_property — cannot buy already-owned tile
❌ buy_property — cannot buy with insufficient balance
❌ buy_property — cannot buy tile player is not on

✅ pay_rent — flat rent (NFT tiles)
✅ pay_rent — OwnedCountMultiplier rent (RPC tiles)
✅ pay_rent — upgrade bonus applied
❌ pay_rent — cannot pay rent to yourself
❌ pay_rent — no rent on unowned tile
```

### 3. Tile Effects (perform_tile_action)
We mock the player position and dice results to test each tile type:

```
✅ Corner — GO already handled
✅ Corner — Graveyard just visiting
✅ Corner — Grant awards 140-340 bonus
✅ Corner — Liquidation: lose DeFi + 10% + graveyard

✅ Tax — deducts 200 (or remaining balance)

✅ Event — Chance card applied (mock die_1)
✅ Event — Chest card applied (mock die_2)
✅ Event — pump.fun moon (+roll×30) and rug (-roll×25)
✅ Event — Solana Conf flat +500

✅ Risk — MEV penalty 10%
✅ Risk — Shield protects and is consumed

✅ Privacy — Buy shield for 200
❌ Privacy — Cannot buy shield twice

✅ DeFi — Stake for 200
✅ DeFi — Earn yield +25 after staking
✅ DeFi — Pay 20 fee if not staked
❌ DeFi — Cannot stake with insufficient balance

✅ School (37, 38) — +50 bonus
✅ Governance (24) — +25 bonus

✅ BioDAO (39) — Buy potion for 500
✅ BioDAO — Potion consumed on graveyard (player safe)
❌ BioDAO — Cannot buy potion twice

✅ Ownable (other owns) — auto-pay rent
✅ Ownable (self-owned) — no rent
✅ Ownable (unowned) — no action

✅ Graveyard trapped — can't perform actions
```

### 4. Settlement
```
✅ settle_game — winner receives 95% of escrow
✅ settle_game — house receives 5% of escrow
❌ settle_game — cannot settle before game ended
❌ settle_game — cannot settle without winner
```

---

## Implementation Approach

Since localnet can't run VRF callbacks, the tests will:
1. **Directly set player state** by calling `create_room` → `join_room` → `start_game`
2. **Manually set player position** by calling a test helper or directly modifying accounts (we add a test-only `set_position` instruction or use `program.account.playerState.fetch` + modify)
3. **Use Anchor's `.rpc()` pattern** for simplicity on localnet

For Tier 1, since we can't trigger VRF callbacks, the gameplay tests will focus on the actions that DON'T need dice (buy_property, pay_rent, perform_tile_action) by simulating that the player is already positioned on the correct tile.

> [!IMPORTANT]
> We will add a **test-only** `test_set_player_position` instruction gated by `#[cfg(feature = "testing")]` so we can position players on specific tiles without needing VRF.

---

## Dependencies Needed

```json
{
  "@magicblock-labs/ephemeral-rollups-sdk": "latest",
  "@magicblock-labs/gum-sdk": "latest",
  "chai": "^4.3.4"
}
```
