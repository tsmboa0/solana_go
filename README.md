# 🎲 Solana Go!

### A fully on-chain, multiplayer capital allocation strategy game built on Solana

*Roll the dice. Buy protocols. Collect rent. Outplay everyone.*

[**▶️ Watch Demo**](https://youtu.be/-u-THWvy9VA) · [**🎮 Play on Devnet**](https://solana-go.vercel.app/) · [**📄 Program Docs**](./solvestor_program/README.md) · [**🖥️ Frontend Docs**](./solvestor_app/README.md)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [User Flow](#-user-flow)
- [System Architecture](#-system-architecture)
- [Solana Program Deep Dive](#-solana-program-deep-dive)
- [Frontend Architecture](#-frontend-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Running Tests](#-running-tests)
- [Roadmap](#-roadmap)
- [License](#-license)

---

## 🌟 Overview

**Solana Go!** transforms the Solana ecosystem into a competitive, 3D board game. Players traverse a 40-tile board where traditional properties are replaced by **real Solana protocols** — spanning DeFi, NFTs, Infrastructure, Privacy, and Gaming. Every move is a capital allocation decision. Luck moves you, but **strategy makes you rich**.

### What Makes It Different

| Feature | Description |
|---|---|
| **100% On-Chain** | All game logic runs in an Anchor smart contract — no off-chain servers |
| **Real Protocols as Tiles** | Jupiter, Helius, Arcium, Mad Lads, Meteora, and 35+ more |
| **Staked Multiplayer** | Players stake SOL to enter; winner takes 95%, house takes 5% |
| **Zero Wallet Popups** | Session Keys sign all gameplay transactions silently in the background |
| **Sub-Second Turns** | Ephemeral Rollups process moves at sequencer speed, not L1 speed |
| **Provably Fair Dice** | Ephemeral VRF delivers un-gameable randomness via cryptographic callback |
| **3D Experience** | React Three Fiber renders an immersive isometric cityscape board |

---

## 🚀 User Flow

```mermaid
flowchart TD
    subgraph LANDING["🏠 Landing Page"]
        A[Visit Solana Go!] --> B[Connect Wallet<br/><i>Phantom / Backpack</i>]
    end

    subgraph MODE["🎮 Mode Select"]
        B --> C{Choose Game Mode}
        C -->|Single Player| D[Play vs CPU<br/><i>Learn the ecosystem risk-free</i>]
        C -->|Multiplayer| E[Stake SOL & Enter Lobby<br/><i>Winner-takes-all</i>]
    end

    subgraph LOBBY["🏢 Lobby"]
        E --> F{Create or Join a Room?}
        F -->|Create| G[Set Parameters<br/><i>Max Players · Stake · Rounds</i>]
        F -->|Join| H[Browse Open Rooms]
        G --> I[Wait for Players]
        H --> I
        I -->|Room Full| J[Auto-Start → Delegate to ER]
    end

    subgraph SESSION["🔑 Session Setup"]
        D --> K[Activate Session Key<br/><i>One-time wallet approval</i>]
        J --> K
    end

    subgraph GAME["🎲 Gameplay Loop"]
        K --> L[Roll Dice<br/><i>VRF request → callback</i>]
        L --> M[3D Token Animates to Tile]
        M --> N{Tile Type?}

        N -->|Ownable| O[Buy Protocol / Pay Rent]
        N -->|DeFi| P[Stake for Yield or Pay Fee]
        N -->|Risk / MEV| Q[Lose % Balance<br/><i>Unless shielded by Arcium</i>]
        N -->|Event| R[Random Chance Card<br/><i>Win big or lose big</i>]
        N -->|Corner| S[GO Bonus · Graveyard<br/>Grant · Liquidation]
        N -->|Privacy| T[Buy Arcium Shield<br/><i>Protects against MEV tiles</i>]
        N -->|Tax| U[Pay Fixed Tax]
        N -->|Governance| V[Earn Voting Reward]
        N -->|School| W[Earn Study Bonus]

        O --> X[End Turn]
        P --> X
        Q --> X
        R --> X
        S --> X
        T --> X
        U --> X
        V --> X
        W --> X
        X --> L
    end

    subgraph END["🏆 Game Over"]
        X -->|go_count ≥ 20| Y[End Game<br/><i>Compute Net Worth</i>]
        Y --> Z[Undelegate to L1<br/><i>Commit Final State</i>]
        Z --> AA[Settle Escrow<br/><i>95% Winner · 5% House</i>]
    end

    style LANDING fill:#1a1a2e,stroke:#9945FF,color:#fff
    style MODE fill:#16213e,stroke:#0f3460,color:#fff
    style LOBBY fill:#1a1a2e,stroke:#e94560,color:#fff
    style SESSION fill:#0f3460,stroke:#53d769,color:#fff
    style GAME fill:#1a1a2e,stroke:#f39c12,color:#fff
    style END fill:#16213e,stroke:#53d769,color:#fff
```

---

## 🏗️ System Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph CLIENT["🖥️ Frontend · React + Three.js + Vite"]
        direction TB
        UI["UI Layer<br/><i>Pages · HUD · Modals · Overlays</i>"]
        SCENE["3D Scene<br/><i>Board · Tiles · Tokens · Dice · City</i>"]
        STORES["State Management<br/><i>Zustand Stores × 5</i>"]
        ENGINE["Optimistic Engine<br/><i>tileActionMirror.ts</i>"]
        HOOKS["Blockchain Hooks<br/><i>useDiceRoll · useSessionKey<br/>useGameActions · useTileActions</i>"]
    end

    subgraph SOLANA_L1["⛓️ Solana L1 (Devnet)"]
        PROGRAM["Solvestor Program<br/><i>HqicBmtY...GLBo</i>"]
        ACCOUNTS["On-Chain Accounts"]
        ESCROW["Escrow PDA<br/><i>Holds staked SOL</i>"]

        subgraph PDA_ACCOUNTS["Program Derived Accounts"]
            GS["GameState PDA<br/><i>seeds: [game, creator, game_id]</i>"]
            PS["PlayerState PDA<br/><i>seeds: [player, game, user]</i>"]
        end
    end

    subgraph ER["⚡ MagicBlock Ephemeral Rollup"]
        ER_SEQ["ER Sequencer<br/><i>Sub-second finality</i>"]
        VRF["Ephemeral VRF Oracle<br/><i>Provably fair randomness</i>"]
        SK["Session Keys<br/><i>Gasless auto-signing</i>"]
    end

    UI --> STORES
    SCENE --> STORES
    STORES <--> HOOKS
    ENGINE --> STORES
    HOOKS <-->|"WebSocket (L1 + ER)"| SOLANA_L1
    HOOKS <-->|"RPC + WS"| ER

    PROGRAM --> PDA_ACCOUNTS
    PROGRAM --> ESCROW
    GS -->|"delegate_game()"| ER_SEQ
    PS -->|"delegate_player()"| ER_SEQ
    ER_SEQ -->|"roll_dice() CPI"| VRF
    VRF -->|"callback_roll_dice()"| ER_SEQ
    SK -->|"Signs gameplay txs"| ER_SEQ
    ER_SEQ -->|"undelegate + commit"| SOLANA_L1

    style CLIENT fill:#0d1117,stroke:#58a6ff,color:#c9d1d9
    style SOLANA_L1 fill:#1a1a2e,stroke:#9945FF,color:#fff
    style ER fill:#1a1a2e,stroke:#f39c12,color:#fff
    style PDA_ACCOUNTS fill:#0f3460,stroke:#9945FF,color:#fff
```

### Smart Contract Lifecycle (L1 ↔ Ephemeral Rollup)

The game operates across **four distinct phases**, seamlessly transitioning between Solana L1 and the MagicBlock Ephemeral Rollup:

```mermaid
sequenceDiagram
    participant P as 👤 Player (Browser)
    participant L1 as ⛓️ Solana L1
    participant ESC as 💰 Escrow PDA
    participant ER as ⚡ Ephemeral Rollup
    participant VRF as 🎲 VRF Oracle

    rect rgb(25, 25, 50)
    Note over P,ESC: Phase 1 — Room Creation & Matchmaking (L1)
    P->>L1: create_room(game_id, round_duration,<br/>start_capital, stake_amount, max_players)
    L1->>L1: Init GameState PDA + Creator PlayerState PDA
    L1->>ESC: Transfer creator's stake to Escrow
    P->>L1: join_room()
    L1->>L1: Init joiner's PlayerState PDA
    L1->>ESC: Transfer joiner's stake to Escrow
    L1-->>L1: Auto-start when player_count == max_players
    end

    rect rgb(50, 30, 10)
    Note over P,ER: Phase 2 — Delegation & Session Auth
    P->>L1: delegate_game(game_id)
    L1->>ER: Migrate GameState → ER Sequencer
    P->>L1: delegate_player() (each player)
    L1->>ER: Migrate PlayerState → ER Sequencer
    P->>ER: Create Session Token (one-time wallet sign)
    Note right of ER: All future txs signed by<br/>ephemeral session key
    end

    rect rgb(10, 50, 30)
    Note over P,VRF: Phase 3 — Gameplay Loop (ER, gasless)
    loop Every Turn
        P->>ER: roll_dice(client_seed) — signed by Session Key
        ER->>VRF: CPI → request randomness
        VRF-->>ER: callback_roll_dice(randomness 32 bytes)
        Note right of ER: die_1 = (hash mod 6) + 1<br/>die_2 = (hash mod 6) + 1<br/>Move player, check GO crossing
        P->>ER: perform_tile_action(tile_index, choose_action)
        Note right of ER: Execute tile effect: rent, yield,<br/>tax, risk, shield, potion, etc.
        opt Ownable + Unowned Tile
            P->>ER: buy_property(tile_index)
        end
    end
    end

    rect rgb(50, 10, 50)
    Note over P,L1: Phase 4 — Settlement & Payout
    P->>ER: end_game(game_id) requires go_count >= 20
    Note right of ER: Compute winner by Net Worth<br/>balance + sum of owned tile values
    ER-->>L1: Commit & undelegate GameState to L1
    P->>L1: settle_game(game_id)
    L1->>ESC: Distribute: 95% → Winner, 5% → House
    end
```

---

## 🔬 Solana Program Deep Dive

> **Program ID**: `CGpK4bRB6DybtWXiTTHXaeoY8RGTCz3cPyHZShaboY23`
>
> **Framework**: Anchor 0.32.1 · **SDK**: Ephemeral Rollups 0.6.5 · VRF 0.2.1 · Session Keys 3.0.10

### On-Chain Account Schema

```mermaid
classDiagram
    class GameState {
        +u64 game_id
        +Pubkey creator
        +u8 bump
        +i64 round_duration
        +u64 start_capital
        +u64 stake_amount
        +u8 max_players
        +Pubkey[10] players
        +u8 player_count
        +Pubkey[40] property_owners
        +u8[40] property_upgrade_levels
        +Pubkey escrow_pda
        +Pubkey authority
        +bool is_ended
        +bool is_started
        +u16 go_count
        +Option~Pubkey~ winner
        +i64 created_at
        ──────────────
        Size: 2,138 bytes
    }

    class PlayerState {
        +Pubkey user
        +Pubkey game
        +u8 player_index
        +u64 balance
        +u8 current_position
        +i64 last_roll_timestamp
        +u8[2] last_dice_result
        +u16 go_passes
        +bool is_active
        +bool has_shield
        +bool has_staked_defi
        +bool has_potion
        +bool is_in_graveyard
        +Pubkey authority
        +u8 bump
        ──────────────
        Size: 122 bytes
    }

    class EscrowPDA {
        «System Account»
        Holds staked SOL
        seeds: [escrow, game_pda]
    }

    GameState "1" --> "2..10" PlayerState : tracks players
    GameState "1" --> "1" EscrowPDA : holds stakes
    GameState --> GameState : property_owners[0..39]
```

### Instruction Reference

| # | Instruction | Layer | Description |
|---|---|---|---|
| 1 | `create_room` | L1 | Init `GameState` + creator `PlayerState` + `Escrow`. Transfer stake. |
| 2 | `join_room` | L1 | Init joiner `PlayerState`, transfer stake. Auto-starts at `max_players`. |
| 3 | `start_game` | L1 | Manual start (if not auto-started). Requires `player_count ≥ 2`. |
| 4 | `delegate_game` | L1 | Delegate `GameState` PDA to MagicBlock Ephemeral Rollup. |
| 5 | `delegate_player` | L1 | Delegate `PlayerState` PDA to MagicBlock Ephemeral Rollup. |
| 6 | `roll_dice` | ER | CPI to Ephemeral VRF oracle. Enforces 20s cooldown between rolls. |
| 7 | `callback_roll_dice` | ER | VRF callback. Derives `die_1`, `die_2` from 32-byte hash. Moves player. |
| 8 | `perform_tile_action` | ER | Executes tile-specific logic (rent, yield, tax, risk, events, shields). |
| 9 | `buy_property` | ER | Purchase an unowned, ownable tile. Deducts buy price from balance. |
| 10 | `pay_rent` | ER | Explicit rent payment to property owner (also handled by `perform_tile_action`). |
| 11 | `leave_room` | ER→L1 | Player forfeits. Sets `is_active=false`, balance=0. Commits + undelegates. |
| 12 | `end_game` | ER→L1 | Computes winner by net worth. Commits + undelegates `GameState` to L1. |
| 13 | `settle_game` | L1 | Distributes escrow: 95% to winner, 5% house fee. |

### Board Layout — 40 Tiles

The board is a 40-tile loop mirroring a real Monopoly board, but every tile represents a **real Solana ecosystem entity**:

```mermaid
block-beta
    columns 11

    block:top:11
        t0["0 · GO\n🚀 Send It"]
        t1["1 · Solflare\n🟤 $60"]
        t2["2 · Community\nChest 🎁"]
        t3["3 · Phantom\n🟤 $60"]
        t4["4 · USDC\nTax 💸"]
        t5["5 · Helius\n🟢 $300"]
        t6["6 · Jupiter\n📈 DeFi"]
        t7["7 · Magic\nCard 🃏"]
        t8["8 · Kamino\n📈 DeFi"]
        t9["9 · Seeker\n🟡 $150"]
        t10["10 · Graveyard\n💀 Trap"]
    end

    t39["39 · DeSci\n🔵 $1000"]:1
    space:9
    t11["11 · Mad Lads\n🟠 $500"]:1

    t38["38 · Turbine\n🏫 School"]:1
    space:9
    t12["12 · Arcium\n🛡️ Shield"]:1

    t37["37 · Blueshift\n🏫 School"]:1
    space:9
    t13["13 · Tensor\n🟠 $550"]:1

    t36["36 · MEV Bot\n⚠️ -10%"]:1
    space:9
    t14["14 · Drift\n📈 DeFi"]:1

    t35["35 · Alchemy\n🟢 $300"]:1
    space:9
    t15["15 · Triton\n🟢 $300"]:1

    t34["34 · Solana\nConf 🎉"]:1
    space:9
    t16["16 · Magic Eden\n🟠 $600"]:1

    t33["33 · Magic\nChest 🎁"]:1
    space:9
    t17["17 · Magic\nChest 🎁"]:1

    t32["32 · pump.fun\n🎰 Meme"]:1
    space:9
    t18["18 · Exchange\nArt 🟠 $650"]:1

    t31["31 · Validator\nB 🔴 $850"]:1
    space:9
    t19["19 · Marinade\n📈 DeFi"]:1

    block:bottom:11
        t30["30 · Liquidation\n☠️ Corner"]
        t29["29 · Validator\nA 🔵 $800"]
        t28["28 · Play\nSolana 🟡"]
        t27["27 · Magic\nCard 🃏"]
        t26["26 · Meteora\n📈 DeFi"]
        t25["25 · QuickNode\n🟢 $300"]
        t24["24 · Governance\n🗳️ Vote"]
        t23["23 · Ledger\n🔵 $220"]
        t22["22 · MEV Bot\n⚠️ -10%"]
        t21["21 · Backpack\n🔵 $200"]
        t20["20 · Grant 💰\nCorner"]
    end

    style t0 fill:#53d769,color:#000
    style t10 fill:#555,color:#fff
    style t20 fill:#f39c12,color:#000
    style t30 fill:#e74c3c,color:#fff
    style t6 fill:#9b59b6,color:#fff
    style t8 fill:#9b59b6,color:#fff
    style t14 fill:#9b59b6,color:#fff
    style t19 fill:#9b59b6,color:#fff
    style t26 fill:#9b59b6,color:#fff
    style t22 fill:#e74c3c,color:#fff
    style t36 fill:#e74c3c,color:#fff
    style t12 fill:#8e44ad,color:#fff
```

### Tile Types & Game Mechanics

| Type | Tiles | Mechanic |
|---|---|---|
| **Ownable** | Solflare, Phantom, Helius, Mad Lads, Tensor, Magic Eden, Exchange Art, Validators, etc. | Buy for listed price. Collect rent when opponents land. Rent scales with color-group monopoly (OwnedCountMultiplier) or flat rate. |
| **DeFi** | Jupiter, Kamino, Drift, Marinade, Meteora | Stake `$200` for passive yield (`+$25` each landing). Non-stakers pay `$20` fee. |
| **Risk / MEV** | MEV Bot ×2 | Lose **10%** of liquid balance — unless protected by an **Arcium Shield**. |
| **Privacy** | Arcium | Buy a shield (`$200`) to deflect the next MEV attack. One-time use. |
| **Event** | Community Chest, Magic Card, pump.fun | Random chance card: win `$50–$300` or lose `$50–$200`. |
| **Tax** | USDC Tax | Flat `$200` deducted from balance. |
| **Corner** | GO, Graveyard, Grant, Liquidation | **GO**: +$200 bonus each pass. **Graveyard**: trapped, 40% penalty, need doubles to escape (or BioDAO potion). **Grant**: bonus. **Liquidation**: penalty. |
| **Governance** | Governance | Earn `$25` voting reward. |
| **School** | Turbine, Blueshift | Earn `$50` study bonus. |

### Game Constants

```
GO_BONUS              = 200        HOUSE_FEE_BPS         = 500 (5%)
ROLL_COOLDOWN         = 20s        GRAVEYARD_PENALTY_BPS = 4000 (40%)
MIN_GO_COUNT_TO_END   = 20         SCHOOL_BONUS          = 50
DEFI_STAKE_COST       = 200        GOVERNANCE_BONUS      = 25
DEFI_LANDING_YIELD    = 25         POTION_COST           = 500
SHIELD_COST           = 200        TAX_AMOUNT            = 200
MEV_PENALTY_BPS       = 1000 (10%)
```

---

## 🖥️ Frontend Architecture

> **Stack**: React 18 · TypeScript · Vite · React Three Fiber · Zustand · React Router

```mermaid
graph LR
    subgraph Pages
        LP[LandingPage]
        MS[ModeSelectPage]
        LB[LobbyPage]
        GP[GamePage]
    end

    subgraph Stores["Zustand Stores"]
        BS[useBlockchainStore<br/><i>L1 + ER connections<br/>Program instances<br/>Account subscriptions</i>]
        GS[useGameStore<br/><i>Game state mirror<br/>Turn logic<br/>Player tracking</i>]
        CS[useCameraStore<br/><i>Orbit controls<br/>Follow-cam</i>]
        US[useUIStore<br/><i>Modals, overlays<br/>Theme toggle</i>]
        AS[useAppStore<br/><i>App-level state</i>]
    end

    subgraph Hooks
        DR[useDiceRoll]
        SK[useSessionKey]
        GA[useGameActions]
        TA[useTileActions]
        TM[useTokenMovement]
        CPU[useCPUPlayer]
        RS[useRemotePlayerSync]
    end

    subgraph Scene["3D Scene (R3F)"]
        B[Board]
        T[Tile × 40]
        PT[PlayerToken]
        DS[DiceScene]
        ENV[Environment<br/><i>City · Skyline · Roads</i>]
        CAM[CameraController]
    end

    subgraph UI["UI Overlay"]
        HUD[HUD]
        TAP[TileActionPopup]
        EC[EventCard]
        DB[DiceButton]
        PM[PortfolioModal]
        CRM[CreateRoomModal]
        SSO[SessionSetupOverlay]
    end

    subgraph Engine
        MIRROR[tileActionMirror.ts<br/><i>Deterministic Rust mirror<br/>for optimistic rendering</i>]
    end

    LP --> MS --> LB --> GP
    GP --> Scene
    GP --> UI
    GP --> Hooks
    Hooks --> Stores
    Hooks --> Engine
    Scene --> Stores

    style Pages fill:#1a1a2e,stroke:#58a6ff,color:#fff
    style Stores fill:#0d1117,stroke:#9945FF,color:#c9d1d9
    style Hooks fill:#0d1117,stroke:#f39c12,color:#c9d1d9
    style Scene fill:#0d1117,stroke:#53d769,color:#c9d1d9
    style UI fill:#0d1117,stroke:#e94560,color:#c9d1d9
    style Engine fill:#0d1117,stroke:#ff6b6b,color:#c9d1d9
```

### Key Design Decisions

- **Optimistic Mirror Engine** — `tileActionMirror.ts` is a pure-TypeScript replication of the Rust `perform_tile_action` logic. When a 3D token lands on a tile, the frontend **instantly** computes the expected state change and updates the HUD, while a fire-and-forget transaction is dispatched to the ER in the background.

- **Dual-Connection WebSockets** — `useBlockchainStore` maintains **simultaneous** WebSocket connections to both Solana L1 (for room lifecycle) and the MagicBlock ER (for gameplay). Account subscriptions switch based on game phase.

- **Session Key Flow** — `useSessionKey` generates an ephemeral `Keypair` in browser memory. The user signs **one** L1 transaction to delegate signing authority. All subsequent gameplay txs are silently signed by this temp key — delivering a Web2-like experience.

- **CPU Player** — `useCPUPlayer` implements AI logic for single-player mode, making buy/stake decisions and automatically rolling dice with configurable delays.

---

## 📁 Project Structure

```
solvestor_game/
├── README.md                            ← You are here
│
├── solvestor_program/                   ← Anchor Solana Program
│   ├── Anchor.toml                      ← Cluster config, program ID
│   ├── Cargo.toml                       ← Workspace manifest
│   ├── programs/
│   │   └── solvestor_program/
│   │       ├── Cargo.toml               ← Dependencies (anchor, ER SDK, VRF, session-keys)
│   │       └── src/
│   │           ├── lib.rs               ← Program entrypoint (12 instructions)
│   │           ├── state.rs             ← GameState & PlayerState accounts
│   │           ├── constants.rs         ← Tile configs, game constants, rent calc
│   │           ├── errors.rs            ← 24 custom error codes
│   │           └── instructions/
│   │               ├── create_room.rs   ← Room + escrow initialization
│   │               ├── join_room.rs     ← Join + auto-start logic
│   │               ├── start_game.rs    ← Manual game start
│   │               ├── delegate.rs      ← L1 → ER delegation (game + player)
│   │               ├── roll_dice.rs     ← VRF request + callback handler
│   │               ├── perform_tile_action.rs  ← Core tile logic (20KB)
│   │               ├── buy_property.rs  ← Property purchase
│   │               ├── pay_rent.rs      ← Rent collection with formulas
│   │               ├── leave_room.rs    ← Forfeit + undelegate
│   │               ├── end_game.rs      ← Winner computation + commit
│   │               ├── settle_game.rs   ← Escrow payout (95/5 split)
│   │               └── mod.rs           ← Module re-exports
│   ├── tests/
│   │   └── solvestor_program.ts         ← Integration test suite (6 phases)
│   └── docs/                            ← Additional documentation
│
├── solvestor_app/                       ← React Frontend
│   ├── vite.config.ts                   ← Vite build config
│   ├── vercel.json                      ← Deployment config
│   ├── index.html                       ← Entry HTML
│   └── src/
│       ├── App.tsx                      ← Router: Landing → Mode → Lobby → Game
│       ├── main.tsx                     ← React DOM mount + providers
│       ├── anchor/                      ← IDL + program types
│       ├── config/
│       │   ├── boardTiles.ts            ← 40-tile schema (mirrors constants.rs)
│       │   ├── onChainConstants.ts      ← Program ID, RPC endpoints
│       │   ├── game.ts                  ← Game config defaults
│       │   ├── players.ts              ← Player color/token config
│       │   └── theme.ts                ← Theme tokens
│       ├── engine/
│       │   └── tileActionMirror.ts      ← Optimistic Rust logic mirror
│       ├── stores/                      ← Zustand state management
│       ├── hooks/                       ← Blockchain interaction hooks
│       ├── pages/                       ← 4 route pages
│       ├── scene/                       ← React Three Fiber 3D components
│       ├── ui/                          ← 17 HUD/modal/overlay components
│       ├── types/                       ← TypeScript type definitions
│       ├── utils/                       ← Helpers
│       └── assets/                      ← Images, fonts, textures
```

---

## 🗺️ Roadmap

```mermaid
timeline
    title Solana Go! Development Roadmap
    section Current (v1.0)
        Launched on Devnet
            : Multiplayer staked matches
            : Single-player vs CPU
            : 40-tile Solana ecosystem board
            : 3D isometric cityscape
            : Session Keys + Ephemeral Rollups
    section Next (v1.5)
        Gameplay Expansion
            : Property upgrades (rent multipliers)
            : Trading between players
            : Spectator mode
            : Tournament brackets
            : Leaderboard system
    section Future (v2.0)
        🦀 OpenClaw AI Agents
            : AI agents can create rooms
            : AI agents can join and play matches
            : Autonomous strategy execution
            : Agent vs Agent tournaments
            : Agent SDK for custom strategies
            : On-chain agent identity & reputation
    section Mainnet (v3.0)
        Production Launch
            : Mainnet deployment
            : Real SOL staking
            : Protocol partnerships for tile sponsorship
            : Mobile-responsive experience
            : DAO governance for board updates
```

### 🦀 OpenClaw AI Agents — The Future of Solana Go!

> *What if AI agents could play the game too?*

In a future release, **OpenClaw** 🦀 AI Agents will be first-class participants in the Solana Go! ecosystem:

- **Create Rooms** — Agents spin up their own matches with configurable parameters
- **Join & Play** — Autonomous agents compete against humans and other agents in staked games
- **Strategic Autonomy** — Each agent runs its own capital allocation strategy: aggressive buyers, yield farmers, risk-averse hoarders, or dynamic portfolio optimizers
- **Agent Tournaments** — Dedicated agent-vs-agent lobbies to stress-test and evolve strategies
- **Open SDK** — A public SDK for anyone to build, deploy, and monetize their own OpenClaw agent
- **On-chain Reputation** — Agent performance tracked on-chain with win rates, ROI, and strategy profiles

This opens Solana Go! to the rapidly growing ecosystem of **autonomous on-chain agents**, turning the game into a perpetual, AI-driven economic simulation of the Solana ecosystem.

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| **Node.js** | ≥ 18 | Frontend + test runner |
| **Yarn** | ≥ 1.22 | Program dependency management |
| **Rust** | stable | Solana program compilation |
| **Anchor CLI** | 0.32.x | Build & deploy framework |
| **Solana CLI** | ≥ 1.18 | Cluster management, keypair tooling |
| **Wallet** | Phantom / Backpack | Devnet interaction |

### 1. Clone & Install

```bash
git clone https://github.com/your-org/solvestor_game.git
cd solvestor_game
```

### 2. Build & Deploy the Smart Contract

```bash
cd solvestor_program
yarn install
anchor build
anchor deploy    # Deploys to the cluster in Anchor.toml
```

### 3. Run the Frontend

```bash
cd solvestor_app
npm install
npm run dev      # Opens at http://localhost:5173
```

> **Note**: The frontend connects to Solana Devnet and MagicBlock's Devnet ER by default. Ensure your wallet is set to **Devnet** and has SOL from a faucet.

---

## 🧪 Running Tests

The integration test suite lives at `solvestor_program/tests/solvestor_program.ts` and validates the **entire game lifecycle** end-to-end across L1 and the Ephemeral Rollup.

### Test Phases

| Phase | Tests | What's Verified |
|---|---|---|
| **1. Room Lifecycle (L1)** | `create_room`, `join_room` | GameState init, PlayerState init, escrow funding, auto-start at max players |
| **2. Delegation (L1→ER)** | `delegate_game`, `delegate_player` ×2 | GameState + both PlayerStates migrated to ER sequencer |
| **3. Dice Rolling (ER+VRF)** | `roll_dice` ×2, `perform_tile_action` ×2, `buy_property` | VRF randomness, dice bounds (1-6), tile actions, property purchase |
| **4. Additional Rounds (ER)** | `roll_dice` (round 2), `perform_tile_action (choose_action=true)` | Cooldown enforcement, shield/DeFi/potion purchase flows |
| **5. State Verification (ER)** | Game state consistency, player state consistency | Property ownership, GO count, player positions, balances |
| **6. Leave Room (ER→L1)** | `leave_room` | Player deactivation, balance zeroed, commit to L1, undelegate |

### Prerequisites

1. **Fund a Player 2 keypair** — the test uses two players. Generate and fund a second keypair:

```bash
cd solvestor_program
solana-keygen new -o player2-keypair.json
solana airdrop 2 $(solana-keygen pubkey player2-keypair.json) --url devnet
```

2. **Set the Ephemeral Rollup endpoint** (optional — defaults to `https://devnet-eu.magicblock.app/`):

```bash
export EPHEMERAL_PROVIDER_ENDPOINT="https://devnet-eu.magicblock.app/"
export EPHEMERAL_WS_ENDPOINT="wss://devnet-eu.magicblock.app/"
```

### Run the Tests

```bash
cd solvestor_program
anchor test --skip-local-validator
```

This runs `yarn run ts-mocha -p ./tsconfig.json -t 1000000 "tests/**/*.ts"` as configured in `Anchor.toml`.

> **⏱️ Timeout**: Tests have a 1,000-second timeout due to the 20-second roll cooldown between rounds and network latency to the ER. A full run typically takes 60–90 seconds.

After completion, the test suite prints a **Transaction Timing Summary** table showing per-instruction latency across L1 and ER layers.

---

## 📄 License

MIT — see [LICENSE](./LICENSE) for details.

---

**Built for the Solana ecosystem. Powered by MagicBlock.**

*Compete. Allocate. Dominate.* 🎲
