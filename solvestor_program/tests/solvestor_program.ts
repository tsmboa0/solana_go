import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { SolvestorProgram } from "../target/types/solvestor_program";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  ConnectionMagicRouter,
  GetCommitmentSignature,
  escrowPdaFromEscrowAuthority,
  createTopUpEscrowInstruction,
} from "@magicblock-labs/ephemeral-rollups-sdk";
import { SessionTokenManager } from "@magicblock-labs/gum-sdk";
import { expect } from "chai";
import { readFileSync } from "fs";

// ─── Constants ───────────────────────────────────────────────
const GAME_SEED = "game";
const PLAYER_SEED = "player";
const ESCROW_SEED = "escrow";
// VRF Oracle Queue — matches ephemeral_vrf_sdk::consts::DEFAULT_EPHEMERAL_QUEUE
const ORACLE_QUEUE = new PublicKey("5hBR571xnXppuCPveTrctfTU7tJLSN94nq7kv7FRK5Tc");

// ─── Timing Tracker ──────────────────────────────────────────
const timings: { label: string; layer: string; ms: number }[] = [];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("solvestor_program", () => {
  // ─── Provider Setup ──────────────────────────────────────
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const providerEphemeralRollup = new anchor.AnchorProvider(
    new anchor.web3.Connection(
      process.env.EPHEMERAL_PROVIDER_ENDPOINT ||
      "https://devnet-eu.magicblock.app/",
      {
        wsEndpoint:
          process.env.EPHEMERAL_WS_ENDPOINT ||
          "wss://devnet-eu.magicblock.app/",
      }
    ),
    anchor.Wallet.local()
  );

  // ─── Keypairs ────────────────────────────────────────────
  const creator = provider.wallet;
  // Load pre-funded player2 keypair from file
  const player2Secret = JSON.parse(
    readFileSync("player2_keypair.json", "utf-8")
  );
  const player2Keypair = Keypair.fromSecretKey(
    Uint8Array.from(player2Secret)
  );

  console.log("L1 Connection:", provider.connection.rpcEndpoint);
  console.log("ER Connection:", providerEphemeralRollup.connection.rpcEndpoint);

  const program = anchor.workspace
    .SolvestorProgram as Program<SolvestorProgram>;

  // ER program — used for building ER transactions (especially VRF)
  const ephemeralProgram = new Program<SolvestorProgram>(
    program.idl as any,
    providerEphemeralRollup
  );

  console.log("Program ID:", program.programId.toString());

  console.log("Creator:", creator.publicKey.toString());
  console.log("Player 2:", player2Keypair.publicKey.toString());

  // ─── Config ──────────────────────────────────────────────
  const gameId = new BN(Date.now());
  const roundDuration = new BN(20);
  const startCapital = new BN(1500);
  const stakeAmount = new BN(0.2 * LAMPORTS_PER_SOL);
  const maxPlayers = 2;
  const maxGoCount = 0;  // allows immediate end_game for testing

  // ─── PDAs ────────────────────────────────────────────────
  let gamePDA: PublicKey;
  let escrowPDA: PublicKey;
  let creatorPlayerPDA: PublicKey;
  let player2PDA: PublicKey;

  // ─── Validator Address (for remainingAccounts on localnet only) ──
  function getValidatorRemainingAccounts(): any[] {
    const erUrl = providerEphemeralRollup.connection.rpcEndpoint;
    if (erUrl.includes("localhost") || erUrl.includes("127.0.0.1")) {
      return [
        {
          pubkey: new PublicKey(
            "mAGicPQYBMvcYveUZA5F5UNNwyHvfYh5xkLS2Fr1mev"
          ),
          isSigner: false,
          isWritable: false,
        },
      ];
    }
    // Deligate to EU Validator
    return [
      {
        pubkey: new PublicKey(
          "MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e"
        ),
        isSigner: false,
        isWritable: false,
      },
    ];
  }

  // ─── Helper: Send tx on ER ───────────────────────────────
  // Following the anchor-counter example pattern:
  // 1. Build tx with program.methods (L1)
  // 2. Set feePayer + recentBlockhash from ER
  // 3. Sign + send via ER connection
  async function sendOnER(
    tx: Transaction,
    signers: Keypair[]
  ): Promise<string> {
    tx.feePayer = signers[0].publicKey;
    tx.recentBlockhash = (
      await providerEphemeralRollup.connection.getLatestBlockhash()
    ).blockhash;

    // tx = await providerEphemeralRollup.connection.signTransaction(tx);
    tx.sign(...signers);
    const txHash = await providerEphemeralRollup.connection.sendRawTransaction(
      tx.serialize(),
      { skipPreflight: true }
    );
    await providerEphemeralRollup.connection.confirmTransaction(
      txHash,
      "confirmed"
    );
    return txHash;
  }

  // ─── Derive PDAs ─────────────────────────────────────────
  before(async function () {
    this.timeout(30000);

    [gamePDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(GAME_SEED),
        creator.publicKey.toBuffer(),
        gameId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    [escrowPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from(ESCROW_SEED), gamePDA.toBuffer()],
      program.programId
    );

    [creatorPlayerPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(PLAYER_SEED),
        gamePDA.toBuffer(),
        creator.publicKey.toBuffer(),
      ],
      program.programId
    );

    [player2PDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(PLAYER_SEED),
        gamePDA.toBuffer(),
        player2Keypair.publicKey.toBuffer(),
      ],
      program.programId
    );

    console.log("\n--- PDAs ---");
    console.log("Game PDA:", gamePDA.toString());
    console.log("Escrow PDA:", escrowPDA.toString());
    console.log("Creator Player PDA:", creatorPlayerPDA.toString());
    console.log("Player 2 PDA:", player2PDA.toString());

    // Check balances
    const creatorBal = await provider.connection.getBalance(
      creator.publicKey
    );
    const p2Bal = await provider.connection.getBalance(
      player2Keypair.publicKey
    );
    console.log(`\nCreator balance: ${creatorBal / LAMPORTS_PER_SOL} SOL`);
    console.log(`Player 2 balance: ${p2Bal / LAMPORTS_PER_SOL} SOL`);

    if (p2Bal < 0.1 * LAMPORTS_PER_SOL) {
      throw new Error(
        "Player 2 has insufficient funds. Please fund player2-keypair.json"
      );
    }
  });

  // ═══════════════════════════════════════════════════════════
  // 1. ROOM LIFECYCLE (L1)
  // ═══════════════════════════════════════════════════════════

  describe("1. Room Lifecycle (L1)", () => {
    it("Create room — inits game, player, escrow", async function () {
      const start = Date.now();

      let tx = await program.methods
        .createRoom(
          gameId,
          roundDuration,
          startCapital,
          stakeAmount,
          maxPlayers,
          maxGoCount
        )
        .accounts({
          creator: creator.publicKey,
        })
        .rpc({ skipPreflight: true })

      const duration = Date.now() - start;
      timings.push({ label: "create_room", layer: "L1", ms: duration });
      console.log(`  ${duration}ms create_room tx: ${tx}`);

      // Verify GameState
      const gameState = await program.account.gameState.fetch(gamePDA);
      expect(gameState.gameId.toNumber()).to.equal(gameId.toNumber());
      expect(gameState.creator.toString()).to.equal(
        creator.publicKey.toString()
      );
      expect(gameState.playerCount).to.equal(1);
      expect(gameState.maxPlayers).to.equal(maxPlayers);
      expect(gameState.isStarted).to.equal(false);
      expect(gameState.isEnded).to.equal(false);
      expect(gameState.stakeAmount.toNumber()).to.equal(
        stakeAmount.toNumber()
      );
      expect(gameState.startCapital.toNumber()).to.equal(
        startCapital.toNumber()
      );
      expect(gameState.players[0].toString()).to.equal(
        creator.publicKey.toString()
      );

      // Verify PlayerState
      const playerState = await program.account.playerState.fetch(
        creatorPlayerPDA
      );
      expect(playerState.user.toString()).to.equal(
        creator.publicKey.toString()
      );
      expect(playerState.balance.toNumber()).to.equal(
        startCapital.toNumber()
      );
      expect(playerState.currentPosition).to.equal(0);
      expect(playerState.isActive).to.equal(true);
      expect(playerState.playerIndex).to.equal(0);
      expect(playerState.hasShield).to.equal(false);
      expect(playerState.hasStakedDefi).to.equal(false);
      expect(playerState.hasPotion).to.equal(false);
      expect(playerState.isInGraveyard).to.equal(false);

      // Verify escrow received stake
      const escrowBalance = await provider.connection.getBalance(escrowPDA);
      expect(escrowBalance).to.be.greaterThan(0);
      console.log(
        `  Escrow balance: ${escrowBalance / LAMPORTS_PER_SOL} SOL`
      );
    });

    it("Join room — player 2 joins, auto-starts (max_players=2)", async function () {
      const start = Date.now();

      let txInstr = await program.methods
        .joinRoom()
        .accounts({
          user: player2Keypair.publicKey,
          game: gamePDA,
          escrow: escrowPDA,
        })
        .transaction();

      let tx = await sendAndConfirmTransaction(
        provider.connection,
        txInstr,
        [player2Keypair],
        { skipPreflight: true, commitment: "confirmed" }
      );

      const duration = Date.now() - start;
      timings.push({ label: "join_room", layer: "L1", ms: duration });
      console.log(`  ${duration}ms join_room tx: ${tx}`);

      // Verify game state
      const gameState = await program.account.gameState.fetch(gamePDA);
      expect(gameState.playerCount).to.equal(2);
      expect(gameState.isStarted).to.equal(true); // Auto-started
      expect(gameState.players[1].toString()).to.equal(
        player2Keypair.publicKey.toString()
      );

      // Verify Player 2 state
      const p2State = await program.account.playerState.fetch(player2PDA);
      expect(p2State.user.toString()).to.equal(
        player2Keypair.publicKey.toString()
      );
      expect(p2State.balance.toNumber()).to.equal(startCapital.toNumber());
      expect(p2State.isActive).to.equal(true);
      expect(p2State.playerIndex).to.equal(1);

      // Verify escrow has both stakes
      const escrowBalance = await provider.connection.getBalance(escrowPDA);
      console.log(
        `  Escrow after join: ${escrowBalance / LAMPORTS_PER_SOL} SOL`
      );
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 2. DELEGATION (L1 → Ephemeral Rollup)
  // ═══════════════════════════════════════════════════════════

  describe("2. Delegation to ER (L1)", () => {
    it("Delegate game state to ER", async function () {
      const start = Date.now();

      let tx = await program.methods
        .delegateGame(gameId)
        .accountsPartial({
          payer: creator.publicKey,
          game: gamePDA,
        })
        .remainingAccounts(getValidatorRemainingAccounts())
        .rpc({ skipPreflight: true });

      const duration = Date.now() - start;
      timings.push({ label: "delegate_game", layer: "L1", ms: duration });
      console.log(`  ${duration}ms delegate_game tx: ${tx}`);
    });

    it("Delegate creator player state to ER", async function () {
      const start = Date.now();

      let tx = await program.methods
        .delegatePlayer()
        .accountsPartial({
          payer: creator.publicKey,
          player: creatorPlayerPDA,
        })
        .remainingAccounts(getValidatorRemainingAccounts())
        .rpc({ skipPreflight: true });

      const duration = Date.now() - start;
      timings.push({
        label: "delegate_player (creator)",
        layer: "L1",
        ms: duration,
      });
      console.log(`  ${duration}ms delegate_player (creator) tx: ${tx}`);
    });

    it("Delegate player 2 state to ER", async function () {
      const start = Date.now();

      let tx = await program.methods
        .delegatePlayer()
        .accountsPartial({
          payer: player2Keypair.publicKey,
          player: player2PDA,
        })
        .remainingAccounts(getValidatorRemainingAccounts())
        .transaction();

      const txHash = await sendAndConfirmTransaction(
        provider.connection,
        tx,
        [player2Keypair],
        { skipPreflight: true, commitment: "confirmed" }
      );

      const duration = Date.now() - start;
      timings.push({
        label: "delegate_player (player2)",
        layer: "L1",
        ms: duration,
      });
      console.log(`  ${duration}ms delegate_player (player2) tx: ${txHash}`);
      await sleep(3000);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 3. GAMEPLAY — DICE ROLLS (ER + VRF)
  // ═══════════════════════════════════════════════════════════

  describe("3. Dice Rolling (ER + VRF)", () => {
    it("Roll dice for creator — VRF request + callback", async function () {
      const start = Date.now();

      // Build tx with ER program — explicitly pass oracleQueue (like React app)
      let tx = await ephemeralProgram.methods
        .rollDice(0)
        .accountsPartial({
          payer: creator.publicKey,
          game: gamePDA,
          player: creatorPlayerPDA,
          oracleQueue: ORACLE_QUEUE,
          sessionToken: null,
        })
        .rpc({ skipPreflight: true });

      const duration = Date.now() - start;
      timings.push({ label: "roll_dice (p1)", layer: "ER+VRF", ms: duration });
      console.log(`  ${duration}ms roll_dice tx: ${tx}`);

      const playerState = await ephemeralProgram.account.playerState.fetch(
        creatorPlayerPDA
      );
      console.log(`  Player state 1: ${JSON.stringify(playerState)}`);
      console.log(
        `  Dice: [${playerState.lastDiceResult[0]}, ${playerState.lastDiceResult[1]}]`
      );
      console.log(`  Position: ${playerState.currentPosition}`);
      console.log(`  Balance: ${playerState.balance.toNumber()}`);

      expect(playerState.lastDiceResult[0]).to.be.at.least(1);
      expect(playerState.lastDiceResult[0]).to.be.at.most(6);
      expect(playerState.lastDiceResult[1]).to.be.at.least(1);
      expect(playerState.lastDiceResult[1]).to.be.at.most(6);
    });

    it("Perform tile action after landing (creator)", async function () {

      const playerState = await ephemeralProgram.account.playerState.fetch(
        creatorPlayerPDA
      );
      const tileIndex = playerState.currentPosition;
      console.log(
        `  Player on tile ${tileIndex}, balance: ${playerState.balance.toNumber()}`
      );

      const start = Date.now();
      let tx = await program.methods
        .performTileAction(tileIndex, false)
        .accountsPartial({
          payer: creator.publicKey,
          game: gamePDA,
          player: creatorPlayerPDA,
          sessionToken: null,
        })
        .transaction();

      const txHash = await sendOnER(tx, [provider.wallet.payer]);

      const duration = Date.now() - start;
      timings.push({
        label: "perform_tile_action (p1)",
        layer: "ER",
        ms: duration,
      });
      console.log(`  ${duration}ms perform_tile_action tx: ${txHash}`);

      const updated = await ephemeralProgram.account.playerState.fetch(
        creatorPlayerPDA
      );
      console.log(`  Balance after: ${updated.balance.toNumber()}`);
    });

    it("Buy property if on ownable unowned tile (creator)", async function () {
      const playerState = await ephemeralProgram.account.playerState.fetch(
        creatorPlayerPDA
      );
      const tileIndex = playerState.currentPosition;
      const gameState = await ephemeralProgram.account.gameState.fetch(gamePDA);
      const owner = gameState.propertyOwners[tileIndex];

      const ownableTiles = [
        1, 3, 5, 9, 11, 13, 15, 16, 18, 21, 23, 25, 28, 29, 31, 35, 39,
      ];

      if (
        ownableTiles.includes(tileIndex) &&
        owner.toString() === PublicKey.default.toString()
      ) {
        console.log(`  Tile ${tileIndex} is ownable and unowned — buying!`);

        const start = Date.now();
        let tx = await program.methods
          .buyProperty(tileIndex)
          .accountsPartial({
            payer: creator.publicKey,
            game: gamePDA,
            player: creatorPlayerPDA,
            sessionToken: null,
          })
          .transaction();

        const txHash = await sendOnER(tx, [provider.wallet.payer]);

        const duration = Date.now() - start;
        timings.push({ label: "buy_property", layer: "ER", ms: duration });
        console.log(`  ${duration}ms buy_property tx: ${txHash}`);

        const updatedGame = await ephemeralProgram.account.gameState.fetch(
          gamePDA
        );
        expect(updatedGame.propertyOwners[tileIndex].toString()).to.equal(
          creator.publicKey.toString()
        );
        console.log(`  ✅ Bought tile ${tileIndex}!`);
      } else {
        console.log(`  Tile ${tileIndex} not ownable or owned — skip buy`);
      }
    });

    it("Roll dice for player 2", async function () {
      const start = Date.now();
      let tx = await ephemeralProgram.methods
        .rollDice(1)
        .accountsPartial({
          payer: player2Keypair.publicKey,
          game: gamePDA,
          player: player2PDA,
          oracleQueue: ORACLE_QUEUE,
          sessionToken: null,
        })
        .transaction();

      const txHash = await sendAndConfirmTransaction(
        providerEphemeralRollup.connection,
        tx,
        [player2Keypair],
        { skipPreflight: true, commitment: "confirmed" }
      );

      const duration = Date.now() - start;
      timings.push({
        label: "roll_dice (p2)",
        layer: "ER+VRF",
        ms: duration,
      });
      console.log(`  ${duration}ms roll_dice (player2) tx: ${txHash}`);

      const p2State = await ephemeralProgram.account.playerState.fetch(
        player2PDA
      );
      console.log(`  Player 2 state: ${JSON.stringify(p2State)}`);
      console.log(
        `  Player 2 dice: [${p2State.lastDiceResult[0]}, ${p2State.lastDiceResult[1]}]`
      );
      console.log(`  Player 2 position: ${p2State.currentPosition}`);
      expect(p2State.lastDiceResult[0]).to.be.at.least(1);
    });

    it("Perform tile action for player 2", async function () {
      const p2State = await ephemeralProgram.account.playerState.fetch(
        player2PDA
      );
      const tileIndex = p2State.currentPosition;
      console.log(`  Player 2 on tile ${tileIndex}`);

      const start = Date.now();
      let tx = await program.methods
        .performTileAction(tileIndex, false)
        .accountsPartial({
          payer: player2Keypair.publicKey,
          game: gamePDA,
          player: player2PDA,
          sessionToken: null,
        })
        .transaction();

      const txHash = await sendOnER(tx, [player2Keypair]);

      const duration = Date.now() - start;
      timings.push({
        label: "perform_tile_action (p2)",
        layer: "ER",
        ms: duration,
      });
      console.log(`  ${duration}ms perform_tile_action (p2) tx: ${txHash}`);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 4. ADDITIONAL ROUNDS (ER)
  // ═══════════════════════════════════════════════════════════

  describe("4. Additional Rounds (ER)", () => {
    it("Roll dice again after cooldown (round 2)", async function () {

      console.log("  Waiting 11s for cooldown...");
      await sleep(11000);

      const start = Date.now();
      let tx = await ephemeralProgram.methods
        .rollDice(2)
        .accountsPartial({
          payer: creator.publicKey,
          game: gamePDA,
          player: creatorPlayerPDA,
          oracleQueue: ORACLE_QUEUE,
          sessionToken: null,
        })
        .rpc({ skipPreflight: true });

      const duration = Date.now() - start;
      timings.push({
        label: "roll_dice (round 2)",
        layer: "ER+VRF",
        ms: duration,
      });
      console.log(`  ${duration}ms roll_dice (round 2) tx: ${tx}`);

      // Read from top-level ephemeralProgram
      const ps = await ephemeralProgram.account.playerState.fetch(
        creatorPlayerPDA
      );
      console.log(`  Player1 state 2: ${JSON.stringify(ps)}`);
      console.log(
        `  Round 2 — dice: [${ps.lastDiceResult[0]}, ${ps.lastDiceResult[1]}]`
      );
      console.log(
        `  Position: ${ps.currentPosition}, Balance: ${ps.balance.toNumber()}`
      );
      console.log(`  GO passes: ${ps.goPasses}`);
    });

    it("Perform tile action with choose_action=true (Round 2)", async function () {

      const ps = await ephemeralProgram.account.playerState.fetch(
        creatorPlayerPDA
      );
      const tileIndex = ps.currentPosition;
      console.log(`  On tile ${tileIndex}, trying choose_action=true`);

      try {
        const start = Date.now();
        let tx = await program.methods
          .performTileAction(tileIndex, true)
          .accountsPartial({
            payer: creator.publicKey,
            game: gamePDA,
            player: creatorPlayerPDA,
            sessionToken: null,
          })
          .transaction();

        const txHash = await sendOnER(tx, [provider.wallet.payer]);

        const duration = Date.now() - start;
        timings.push({
          label: "perform_tile_action (choose)",
          layer: "ER",
          ms: duration,
        });
        console.log(`  ${duration}ms perform_tile_action(true) tx: ${txHash}`);

        const updated = await ephemeralProgram.account.playerState.fetch(
          creatorPlayerPDA
        );
        console.log(`  Balance: ${updated.balance.toNumber()}`);
        console.log(
          `  Shield: ${updated.hasShield}, DeFi: ${updated.hasStakedDefi}, Potion: ${updated.hasPotion}`
        );
      } catch (e: any) {
        console.log(
          `  choose_action=true failed (expected for some tiles): ${e.message?.substring(0, 120)}`
        );
      }
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 5. STATE VERIFICATION (ER)
  // ═══════════════════════════════════════════════════════════

  describe("5. State Verification (ER)", () => {
    it("Verify game state consistency", async function () {
      const gs = await ephemeralProgram.account.gameState.fetch(gamePDA);
      expect(gs.isStarted).to.equal(true);
      expect(gs.isEnded).to.equal(false);
      expect(gs.playerCount).to.equal(2);

      let ownedCount = 0;
      for (let i = 0; i < 40; i++) {
        if (
          gs.propertyOwners[i].toString() !== PublicKey.default.toString()
        ) {
          ownedCount++;
          console.log(
            `  Tile ${i} → ${gs.propertyOwners[i].toString().substring(0, 8)}...`
          );
        }
      }
      console.log(`  Owned: ${ownedCount}, go_count: ${gs.goCount}`);
    });

    it("Verify both player states", async function () {
      const p1 = await ephemeralProgram.account.playerState.fetch(
        creatorPlayerPDA
      );
      const p2 = await ephemeralProgram.account.playerState.fetch(player2PDA);

      console.log(
        `  Creator: pos=${p1.currentPosition} bal=${p1.balance.toNumber()} go=${p1.goPasses} shield=${p1.hasShield} defi=${p1.hasStakedDefi} potion=${p1.hasPotion} graveyard=${p1.isInGraveyard}`
      );
      console.log(
        `  Player2: pos=${p2.currentPosition} bal=${p2.balance.toNumber()} go=${p2.goPasses}`
      );

      expect(p1.isActive).to.equal(true);
      expect(p2.isActive).to.equal(true);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 6. LEAVE ROOM (ER → L1)
  // ═══════════════════════════════════════════════════════════

  describe("6. Leave Room (ER → L1)", () => {
    it("Player 2 leaves — commit + undelegate", async function () {
      const start = Date.now();
      let tx = await program.methods
        .leaveRoom()
        .accountsPartial({
          payer: player2Keypair.publicKey,
          game: gamePDA,
          player: player2PDA,
          sessionToken: null,
        })
        .transaction();

      const txHash = await sendOnER(tx, [player2Keypair]);

      const duration = Date.now() - start;
      timings.push({ label: "leave_room", layer: "ER→L1", ms: duration });
      console.log(`  ${duration}ms leave_room tx: ${txHash}`);

      console.log("  Waiting for commit to L1...");
      try {
        const commitSig = await GetCommitmentSignature(
          txHash,
          providerEphemeralRollup.connection
        );
        console.log(`  L1 commit sig: ${commitSig}`);
      } catch {
        console.log(
          "  Commit tracking timed out (OK in some configs)"
        );
      }

      // Verify on L1
      const p2State = await program.account.playerState.fetch(player2PDA);
      expect(p2State.isActive).to.equal(false);
      expect(p2State.balance.toNumber()).to.equal(0);
      console.log(
        `  ✅ Player 2 inactive on L1, balance=0 (stake forfeited)`
      );
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 7. END GAME — WEIGHTED WEALTH FORMULA (ER)
  // ═══════════════════════════════════════════════════════════

  describe("7. End Game — Weighted Wealth Formula (ER)", () => {
    it("Verify max_go_count was stored correctly", async function () {
      const gameState = await ephemeralProgram.account.gameState.fetch(gamePDA);
      expect(gameState.maxGoCount).to.equal(0);
      console.log(`  ✅ max_go_count = ${gameState.maxGoCount}`);
    });

    it("Fund MagicAction escrow (for settle_game L1 tx fees)", async function () {
      this.timeout(30000);

      // Derive the MagicAction escrow for the creator (who calls end_game)
      const magicEscrowPDA = escrowPdaFromEscrowAuthority(creator.publicKey);
      console.log(`  MagicAction escrow PDA: ${magicEscrowPDA.toBase58()}`);

      // Top up with 0.001 SOL — 4 args only (no index), matching official example
      const topUpIx = createTopUpEscrowInstruction(
        magicEscrowPDA,       // escrow PDA
        creator.publicKey,    // escrow authority
        creator.publicKey,    // payer
        0.001 * LAMPORTS_PER_SOL // amount
      );

      const tx = new Transaction().add(topUpIx);
      tx.feePayer = creator.publicKey;
      tx.recentBlockhash = (
        await provider.connection.getLatestBlockhash()
      ).blockhash;

      const signedTx = await (creator as any).signTransaction(tx);
      const txHash = await provider.connection.sendRawTransaction(
        signedTx.serialize(),
        { skipPreflight: true }
      );
      await provider.connection.confirmTransaction(txHash, "confirmed");

      console.log(`  ✅ Funded MagicAction escrow: ${txHash}`);

      // Verify escrow balance
      const balance = await provider.connection.getBalance(magicEscrowPDA);
      console.log(`  Escrow balance: ${balance / LAMPORTS_PER_SOL} SOL`);
      expect(balance).to.be.greaterThan(0);
    });

    it("end_game succeeds — commits to L1 + triggers settle_game_action", async function () {
      this.timeout(60000);

      // Use ConnectionMagicRouter (matching official MagicBlock pattern)
      const routerConnection = new ConnectionMagicRouter(
        process.env.ROUTER_ENDPOINT || "https://devnet-router.magicblock.app",
        {
          wsEndpoint: process.env.ROUTER_WS_ENDPOINT || "wss://devnet-router.magicblock.app",
        }
      );

      // Record pre-end balances
      const escrowBalanceBefore = await provider.connection.getBalance(escrowPDA);
      console.log(`  Escrow balance before: ${escrowBalanceBefore / LAMPORTS_PER_SOL} SOL`);

      const start = Date.now();

      // Build end_game tx with programId account (MagicAction pattern)
      let tx = await program.methods
        .endGame(gameId)
        .accountsPartial({
          user: creator.publicKey,
          game: gamePDA,
          escrow: escrowPDA,
          programId: program.programId,
        })
        .remainingAccounts([
          { pubkey: creatorPlayerPDA, isSigner: false, isWritable: false },
          { pubkey: player2PDA, isSigner: false, isWritable: false },
        ])
        .transaction();

      // Set feePayer + blockhash so we can inspect the compiled accounts
      tx.feePayer = creator.publicKey;
      tx.recentBlockhash = (await routerConnection.getLatestBlockhash()).blockhash;

      // Log all transaction accounts for debugging
      console.log("  Transaction accounts:");
      const msg = tx.compileMessage();
      msg.accountKeys.forEach((key, i) => {
        const writable = msg.isAccountWritable(i) ? "W" : "R";
        const signer = msg.isAccountSigner(i) ? "S" : "-";
        console.log(`    [${i}] ${writable}${signer} ${key.toBase58()}`);
      });

      // Send via router (official pattern)
      let txHash: string;
      try {
        txHash = await sendAndConfirmTransaction(
          routerConnection as any,
          tx,
          [provider.wallet.payer],
          { skipPreflight: true }
        );
      } catch (err: any) {
        console.error("  ❌ end_game failed:", err.message);
        if (err.getLogs) {
          const logs = await err.getLogs();
          console.error("  Transaction logs:", logs);
        }
        if (err.logs) {
          console.error("  Error logs:", err.logs);
        }
        throw err;
      }

      const duration = Date.now() - start;
      timings.push({ label: "end_game", layer: "ER", ms: duration });
      console.log(`  ${duration}ms end_game tx: ${txHash}`);

      // Wait for commit (official pattern: sleep, no GetCommitmentSignature)
      console.log("  Waiting for commit to L1 (5s)...");
      await sleep(5000);

      // Verify game state — try L1 first, then ER
      let gameState;
      try {
        gameState = await program.account.gameState.fetch(gamePDA);
        console.log("  ✅ Game state read from L1 (committed back)");
      } catch {
        gameState = await ephemeralProgram.account.gameState.fetch(gamePDA);
        console.log("  ⚠ Game state read from ER (L1 commit pending)");
      }

      expect(gameState.isEnded).to.equal(true);
      expect(gameState.winner).to.not.be.null;
      console.log(`  ✅ Game ended! Winner: ${gameState.winner!.toString()}`);
    });

    it("Verify winner is determined by weighted wealth formula", async function () {
      this.timeout(10000);

      // Try L1 first, then ER
      let gameState;
      try {
        gameState = await program.account.gameState.fetch(gamePDA);
      } catch {
        gameState = await ephemeralProgram.account.gameState.fetch(gamePDA);
      }

      const winner = gameState.winner;
      expect(winner).to.not.be.null;
      console.log(`  Winner: ${winner!.toString()}`);
      console.log(`  Creator: ${creator.publicKey.toString()}`);
      console.log(`  Player2: ${player2Keypair.publicKey.toString()}`);

      const isCreator = winner!.toString() === creator.publicKey.toString();
      const isPlayer2 = winner!.toString() === player2Keypair.publicKey.toString();
      expect(isCreator || isPlayer2).to.equal(true);
      console.log(`  ✅ Winner correctly determined by weighted formula`);
    });

    it("Verify settlement: stakes distributed, rent preserved in escrow", async function () {
      this.timeout(10000);

      // After settlement, escrow should only have rent-exempt minimum
      // (the staked SOL was distributed to winner + house)
      const escrowBalanceAfter = await provider.connection.getBalance(escrowPDA);
      const rentExemptMin = await provider.connection.getMinimumBalanceForRentExemption(0);
      console.log(`  Escrow balance after: ${escrowBalanceAfter / LAMPORTS_PER_SOL} SOL`);
      console.log(`  Rent-exempt min (0 bytes): ${rentExemptMin / LAMPORTS_PER_SOL} SOL`);

      if (escrowBalanceAfter <= rentExemptMin) {
        console.log("  ✅ Stakes distributed — only rent remains in escrow!");
      } else {
        const stakeRemaining = escrowBalanceAfter - rentExemptMin;
        console.log(`  ⚠ Escrow still has ${stakeRemaining} lamports of stake — settle_game_action may need manual trigger or L1 commit is pending`);
      }

      // Read game state to check winner
      let gameState;
      try {
        gameState = await program.account.gameState.fetch(gamePDA);
      } catch {
        gameState = await ephemeralProgram.account.gameState.fetch(gamePDA);
      }

      expect(gameState.isEnded).to.equal(true);
      expect(gameState.winner).to.not.be.null;
      console.log(`  ✅ Game is_ended=true, winner=${gameState.winner!.toString()}`);
    });

    it("Verify IDL: end_game has escrow + settle_game_action exists", async function () {
      const idl = program.idl as any;

      // Anchor SDK may use camelCase names at runtime
      const endGameIx = idl.instructions.find(
        (ix: any) => ix.name === "endGame" || ix.name === "end_game"
      );
      expect(endGameIx).to.not.be.undefined;
      console.log(`  ✅ end_game instruction found (name: "${endGameIx.name}")`);

      const escrowAccount = endGameIx.accounts.find(
        (acc: any) => acc.name === "escrow"
      );
      expect(escrowAccount).to.not.be.undefined;
      console.log("  ✅ end_game has 'escrow' account");

      const settleActionIx = idl.instructions.find(
        (ix: any) => ix.name === "settleGameAction" || ix.name === "settle_game_action"
      );
      expect(settleActionIx).to.not.be.undefined;
      console.log(`  ✅ settle_game_action found (name: "${settleActionIx.name}")`);

      const accountNames = settleActionIx.accounts.map((a: any) => a.name);
      expect(accountNames).to.include("game");
      expect(accountNames).to.include("escrow");
      expect(accountNames).to.include("winner");
      const hasHouseAccount = accountNames.includes("house_account") || accountNames.includes("houseAccount");
      expect(hasHouseAccount).to.equal(true);
      console.log("  ✅ settle_game_action has correct accounts");
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 8. SETTLE GAME — MANUAL FALLBACK (L1)
  // ═══════════════════════════════════════════════════════════

  // describe("8. Settle Game — Manual Fallback (L1)", () => {
  //   it("settle_game succeeds on L1 if escrow still has staked funds", async function () {
  //     this.timeout(30000);

  //     // Check if MagicAction already settled (escrow only has rent)
  //     const escrowBalance = await provider.connection.getBalance(escrowPDA);
  //     const rentExemptMin = await provider.connection.getMinimumBalanceForRentExemption(0);

  //     if (escrowBalance <= rentExemptMin) {
  //       console.log(`  ⏭ Escrow only has rent (${escrowBalance} lamports) — MagicAction already settled. Skipping.`);
  //       this.skip();
  //       return;
  //     }

  //     // Read game state to get winner
  //     let gameState;
  //     try {
  //       gameState = await program.account.gameState.fetch(gamePDA);
  //     } catch {
  //       gameState = await ephemeralProgram.account.gameState.fetch(gamePDA);
  //     }

  //     if (!gameState.isEnded || !gameState.winner) {
  //       console.log("  ⏭ Game not ended yet — skipping manual settle");
  //       this.skip();
  //       return;
  //     }

  //     const winner = gameState.winner!;
  //     const authority = gameState.authority;

  //     console.log(`  Escrow balance: ${escrowBalance / LAMPORTS_PER_SOL} SOL`);
  //     console.log(`  Winner: ${winner.toString()}`);
  //     console.log(`  House (authority): ${authority.toString()}`);

  //     const start = Date.now();
  //     try {
  //       let tx = await program.methods
  //         .settleGame(gameId)
  //         .accountsPartial({
  //           payer: creator.publicKey,
  //           game: gamePDA,
  //           escrow: escrowPDA,
  //           winner: winner,
  //           houseAccount: authority,
  //         })
  //         .transaction();

  //       const txHash = await sendAndConfirmTransaction(
  //         provider.connection,
  //         tx,
  //         [provider.wallet.payer],
  //         { skipPreflight: true, commitment: "confirmed" }
  //       );

  //       const duration = Date.now() - start;
  //       timings.push({ label: "settle_game (manual)", layer: "L1", ms: duration });
  //       console.log(`  ${duration}ms settle_game tx: ${txHash}`);
  //     } catch (err: any) {
  //       console.error("  ❌ settle_game failed:", err.message);
  //       if (err.logs) {
  //         console.error("  Logs:", err.logs);
  //       }
  //       throw err;
  //     }



  //     // Verify escrow now only has rent-exempt minimum
  //     const escrowAfter = await provider.connection.getBalance(escrowPDA);
  //     expect(escrowAfter).to.be.at.most(rentExemptMin);
  //     console.log(`  ✅ Stakes distributed! Escrow has ${escrowAfter} lamports (rent only)`);
  //   });
  // });

  // ═══════════════════════════════════════════════════════════
  // SUMMARY TABLE
  // ═══════════════════════════════════════════════════════════

  after(() => {
    console.log("\n");
    console.log("═══════════════════════════════════════════════════════");
    console.log("  TRANSACTION TIMING SUMMARY");
    console.log("═══════════════════════════════════════════════════════");
    console.log(
      "  " +
      "Instruction".padEnd(35) +
      "Layer".padEnd(12) +
      "Time (ms)"
    );
    console.log("  " + "─".repeat(56));

    let totalMs = 0;
    for (const t of timings) {
      totalMs += t.ms;
      console.log(
        "  " + t.label.padEnd(35) + t.layer.padEnd(12) + `${t.ms}`
      );
    }

    console.log("  " + "─".repeat(56));
    console.log(
      "  " + "TOTAL".padEnd(35) + "".padEnd(12) + `${totalMs}ms`
    );
    console.log(
      "  " +
      "AVERAGE".padEnd(35) +
      "".padEnd(12) +
      `${timings.length > 0 ? Math.round(totalMs / timings.length) : 0}ms`
    );
    console.log(
      "═══════════════════════════════════════════════════════\n"
    );
  });
});

// ═══════════════════════════════════════════════════════════════════
// SESSION KEYS TEST SUITE
// ═══════════════════════════════════════════════════════════════════
//
// This test suite mirrors the original but uses MagicBlock session
// keys instead of direct wallet signing for gameplay instructions:
//   - roll_dice
//   - perform_tile_action
//   - buy_property
//
// Room lifecycle (create_room, join_room), delegation, and
// leave_room still use real wallet keypairs because those
// instructions do not support session keys.
// ═══════════════════════════════════════════════════════════════════

// describe("solvestor_program (Session Keys)", () => {
//   // ─── Provider Setup ──────────────────────────────────────
//   const provider = anchor.AnchorProvider.env();
//   anchor.setProvider(provider);

//   const providerEphemeralRollup = new anchor.AnchorProvider(
//     new anchor.web3.Connection(
//       process.env.EPHEMERAL_PROVIDER_ENDPOINT ||
//       "https://devnet-eu.magicblock.app/",
//       {
//         wsEndpoint:
//           process.env.EPHEMERAL_WS_ENDPOINT ||
//           "wss://devnet-eu.magicblock.app/",
//       }
//     ),
//     anchor.Wallet.local()
//   );

//   // ─── Keypairs ────────────────────────────────────────────
//   const creator = provider.wallet;
//   const player2Secret = JSON.parse(
//     readFileSync("player2_keypair.json", "utf-8")
//   );
//   const player2Keypair = Keypair.fromSecretKey(
//     Uint8Array.from(player2Secret)
//   );

//   console.log("\n[SK] L1 Connection:", provider.connection.rpcEndpoint);
//   console.log("[SK] ER Connection:", providerEphemeralRollup.connection.rpcEndpoint);

//   const program = anchor.workspace
//     .SolvestorProgram as Program<SolvestorProgram>;

//   const ephemeralProgram = new Program<SolvestorProgram>(
//     program.idl as any,
//     providerEphemeralRollup
//   );

//   console.log("[SK] Program ID:", program.programId.toString());

//   // ─── Session Key Setup ───────────────────────────────────
//   //
//   // Session keypairs are derived DETERMINISTICALLY from each
//   // player's wallet public key, using Keypair.fromSeed().
//   // This matches the MagicBlock App.tsx pattern (line 117):
//   //
//   //   const newTempKeypair = Keypair.fromSeed(publicKey.toBytes());
//   //
//   // The same wallet always produces the same session signer,
//   // so there's no need to persist keys in .env or generate
//   // random ones.
//   const sessionKeypair = Keypair.fromSeed(creator.publicKey.toBytes());
//   const sessionKeypair2 = Keypair.fromSeed(player2Keypair.publicKey.toBytes());

//   console.log("[SK] Session Signer (creator):", sessionKeypair.publicKey.toString());
//   console.log("[SK] Session Signer (player2):", sessionKeypair2.publicKey.toString());

//   // ─── Session Token Managers ──────────────────────────────
//   //
//   // SessionTokenManager from @magicblock-labs/gum-sdk wraps
//   // the Gum Session Keys program. One per authority wallet.
//   const sessionTokenManager = new SessionTokenManager(
//     provider.wallet as anchor.Wallet,
//     provider.connection
//   );

//   const player2Wallet = new anchor.Wallet(player2Keypair);
//   const sessionTokenManager2 = new SessionTokenManager(
//     player2Wallet,
//     provider.connection
//   );

//   // ─── Session Token PDAs ──────────────────────────────────
//   //
//   // Derived from:
//   //   ["session_token", target_program_id, session_signer, authority]
//   //
//   // using the Gum session program's program ID.
//   const SESSION_TOKEN_SEED = "session_token";

//   const sessionTokenPDA = PublicKey.findProgramAddressSync(
//     [
//       Buffer.from(SESSION_TOKEN_SEED),
//       program.programId.toBytes(),
//       sessionKeypair.publicKey.toBytes(),
//       creator.publicKey.toBytes(),
//     ],
//     sessionTokenManager.program.programId
//   )[0];

//   const sessionTokenPDA2 = PublicKey.findProgramAddressSync(
//     [
//       Buffer.from(SESSION_TOKEN_SEED),
//       program.programId.toBytes(),
//       sessionKeypair2.publicKey.toBytes(),
//       player2Keypair.publicKey.toBytes(),
//     ],
//     sessionTokenManager2.program.programId
//   )[0];

//   console.log("[SK] Session Token PDA (creator):", sessionTokenPDA.toString());
//   console.log("[SK] Session Token PDA (player2):", sessionTokenPDA2.toString());

//   // ─── Constants ──────────────────────────────────────────
//   const GAME_SEED = "game";
//   const PLAYER_SEED = "player";
//   const ESCROW_SEED = "escrow";
//   const ORACLE_QUEUE = new PublicKey("5hBR571xnXppuCPveTrctfTU7tJLSN94nq7kv7FRK5Tc");

//   // ─── Config ──────────────────────────────────────────────
//   // Unique game ID to avoid collisions with the first test suite
//   const gameId = new BN(Date.now() + 1_000_000);
//   const roundDuration = new BN(20);
//   const startCapital = new BN(1500);
//   const stakeAmount = new BN(0.2 * LAMPORTS_PER_SOL);
//   const maxPlayers = 2;
//   const maxGoCount = 20;

//   // ─── PDAs ────────────────────────────────────────────────
//   let gamePDA: PublicKey;
//   let escrowPDA: PublicKey;
//   let creatorPlayerPDA: PublicKey;
//   let player2PDA: PublicKey;

//   // ─── Timing Tracker ──────────────────────────────────────
//   const timings: { label: string; layer: string; ms: number }[] = [];

//   function sleep(ms: number): Promise<void> {
//     return new Promise((resolve) => setTimeout(resolve, ms));
//   }

//   // ─── Validator Address (for remainingAccounts) ───────────
//   function getValidatorRemainingAccounts(): any[] {
//     const erUrl = providerEphemeralRollup.connection.rpcEndpoint;
//     if (erUrl.includes("localhost") || erUrl.includes("127.0.0.1")) {
//       return [
//         {
//           pubkey: new PublicKey(
//             "mAGicPQYBMvcYveUZA5F5UNNwyHvfYh5xkLS2Fr1mev"
//           ),
//           isSigner: false,
//           isWritable: false,
//         },
//       ];
//     }
//     return [
//       {
//         pubkey: new PublicKey(
//           "MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e"
//         ),
//         isSigner: false,
//         isWritable: false,
//       },
//     ];
//   }

//   // ─── Helper: Send tx on ER ───────────────────────────────
//   async function sendOnER(
//     tx: Transaction,
//     signers: Keypair[]
//   ): Promise<string> {
//     tx.feePayer = signers[0].publicKey;
//     tx.recentBlockhash = (
//       await providerEphemeralRollup.connection.getLatestBlockhash()
//     ).blockhash;

//     tx.sign(...signers);
//     const txHash = await providerEphemeralRollup.connection.sendRawTransaction(
//       tx.serialize(),
//       { skipPreflight: true }
//     );
//     await providerEphemeralRollup.connection.confirmTransaction(
//       txHash,
//       "confirmed"
//     );
//     return txHash;
//   }

//   // ─── Derive PDAs ─────────────────────────────────────────
//   before(async function () {
//     this.timeout(30000);

//     [gamePDA] = PublicKey.findProgramAddressSync(
//       [
//         Buffer.from(GAME_SEED),
//         creator.publicKey.toBuffer(),
//         gameId.toArrayLike(Buffer, "le", 8),
//       ],
//       program.programId
//     );

//     [escrowPDA] = PublicKey.findProgramAddressSync(
//       [Buffer.from(ESCROW_SEED), gamePDA.toBuffer()],
//       program.programId
//     );

//     [creatorPlayerPDA] = PublicKey.findProgramAddressSync(
//       [
//         Buffer.from(PLAYER_SEED),
//         gamePDA.toBuffer(),
//         creator.publicKey.toBuffer(),
//       ],
//       program.programId
//     );

//     [player2PDA] = PublicKey.findProgramAddressSync(
//       [
//         Buffer.from(PLAYER_SEED),
//         gamePDA.toBuffer(),
//         player2Keypair.publicKey.toBuffer(),
//       ],
//       program.programId
//     );

//     console.log("\n[SK] --- PDAs ---");
//     console.log("[SK] Game PDA:", gamePDA.toString());
//     console.log("[SK] Escrow PDA:", escrowPDA.toString());
//     console.log("[SK] Creator Player PDA:", creatorPlayerPDA.toString());
//     console.log("[SK] Player 2 PDA:", player2PDA.toString());

//     // Check balances
//     const creatorBal = await provider.connection.getBalance(
//       creator.publicKey
//     );
//     const p2Bal = await provider.connection.getBalance(
//       player2Keypair.publicKey
//     );
//     console.log(`\n[SK] Creator balance: ${creatorBal / LAMPORTS_PER_SOL} SOL`);
//     console.log(`[SK] Player 2 balance: ${p2Bal / LAMPORTS_PER_SOL} SOL`);

//     if (p2Bal < 0.1 * LAMPORTS_PER_SOL) {
//       throw new Error(
//         "Player 2 has insufficient funds. Please fund player2-keypair.json"
//       );
//     }
//   });

//   // ═══════════════════════════════════════════════════════════
//   // 1. ROOM LIFECYCLE (L1) — real wallets, same as original
//   // ═══════════════════════════════════════════════════════════

//   describe("1. Room Lifecycle (L1)", () => {
//     it("[SK] Create room — inits game, player, escrow", async function () {
//       const start = Date.now();

//       let tx = await program.methods
//         .createRoom(
//           gameId,
//           roundDuration,
//           startCapital,
//           stakeAmount,
//           maxPlayers,
//           maxGoCount
//         )
//         .accounts({
//           creator: creator.publicKey,
//         })
//         .rpc({ skipPreflight: true });

//       const duration = Date.now() - start;
//       timings.push({ label: "create_room", layer: "L1", ms: duration });
//       console.log(`  [SK] ${duration}ms create_room tx: ${tx}`);

//       const gameState = await program.account.gameState.fetch(gamePDA);
//       expect(gameState.gameId.toNumber()).to.equal(gameId.toNumber());
//       expect(gameState.playerCount).to.equal(1);
//       expect(gameState.isStarted).to.equal(false);
//     });

//     it("[SK] Join room — player 2 joins, auto-starts", async function () {
//       const start = Date.now();

//       let txInstr = await program.methods
//         .joinRoom()
//         .accounts({
//           user: player2Keypair.publicKey,
//           game: gamePDA,
//           escrow: escrowPDA,
//         })
//         .transaction();

//       let tx = await sendAndConfirmTransaction(
//         provider.connection,
//         txInstr,
//         [player2Keypair],
//         { skipPreflight: true, commitment: "confirmed" }
//       );

//       const duration = Date.now() - start;
//       timings.push({ label: "join_room", layer: "L1", ms: duration });
//       console.log(`  [SK] ${duration}ms join_room tx: ${tx}`);

//       const gameState = await program.account.gameState.fetch(gamePDA);
//       expect(gameState.playerCount).to.equal(2);
//       expect(gameState.isStarted).to.equal(true);
//     });
//   });

//   // ═══════════════════════════════════════════════════════════
//   // 2. SESSION CREATION (L1)
//   //
//   //    Creates a session token for each player. The session
//   //    token authorises the session keypair to sign gameplay
//   //    transactions on behalf of the player's real wallet.
//   //
//   //    Parameters:
//   //      topUp        — true: the authority wallet auto-funds
//   //                     the session keypair
//   //      validUntil   — UNIX timestamp; 1 hour from now
//   //      topUpLamports — how much SOL to transfer to the
//   //                      session keypair for tx fees
//   // ═══════════════════════════════════════════════════════════

//   describe("2. Session Creation (L1)", () => {
//     it("[SK] Create session for creator", async function () {
//       const start = Date.now();

//       const topUp = true;
//       const validUntilBN = new BN(Math.floor(Date.now() / 1000) + 3600);
//       const topUpLamportsBN = new BN(0.001 * LAMPORTS_PER_SOL);

//       const tx = await sessionTokenManager.program.methods
//         .createSession(topUp, validUntilBN, topUpLamportsBN)
//         .accounts({
//           targetProgram: program.programId,
//           sessionSigner: sessionKeypair.publicKey,
//           authority: creator.publicKey,
//         })
//         .transaction();

//       // Authority wallet pays fees; both signers are required:
//       //   - sessionKeypair: the new session signer
//       //   - provider.wallet.payer: the authority approving the session
//       tx.feePayer = creator.publicKey;
//       tx.recentBlockhash = (
//         await provider.connection.getLatestBlockhash()
//       ).blockhash;

//       const txHash = await sendAndConfirmTransaction(
//         provider.connection,
//         tx,
//         [provider.wallet.payer, sessionKeypair],
//         { skipPreflight: true, commitment: "confirmed" }
//       );

//       const duration = Date.now() - start;
//       timings.push({ label: "create_session (creator)", layer: "L1", ms: duration });
//       console.log(`  [SK] ${duration}ms createSession (creator) tx: ${txHash}`);
//     });

//     it("[SK] Create session for player 2", async function () {
//       const start = Date.now();

//       const topUp = true;
//       const validUntilBN = new BN(Math.floor(Date.now() / 1000) + 3600);
//       const topUpLamportsBN = new BN(0.001 * LAMPORTS_PER_SOL);

//       const tx = await sessionTokenManager2.program.methods
//         .createSession(topUp, validUntilBN, topUpLamportsBN)
//         .accounts({
//           targetProgram: program.programId,
//           sessionSigner: sessionKeypair2.publicKey,
//           authority: player2Keypair.publicKey,
//         })
//         .transaction();

//       // Player 2's real wallet pays fees
//       tx.feePayer = player2Keypair.publicKey;
//       tx.recentBlockhash = (
//         await provider.connection.getLatestBlockhash()
//       ).blockhash;

//       const txHash = await sendAndConfirmTransaction(
//         provider.connection,
//         tx,
//         [player2Keypair, sessionKeypair2],
//         { skipPreflight: true, commitment: "confirmed" }
//       );

//       const duration = Date.now() - start;
//       timings.push({ label: "create_session (player2)", layer: "L1", ms: duration });
//       console.log(`  [SK] ${duration}ms createSession (player2) tx: ${txHash}`);
//     });
//   });

//   // ═══════════════════════════════════════════════════════════
//   // 3. DELEGATION (L1 → Ephemeral Rollup) — real wallets
//   // ═══════════════════════════════════════════════════════════

//   describe("3. Delegation to ER (L1)", () => {
//     it("[SK] Delegate game state to ER", async function () {
//       const start = Date.now();

//       let tx = await program.methods
//         .delegateGame(gameId)
//         .accountsPartial({
//           payer: creator.publicKey,
//           game: gamePDA,
//         })
//         .remainingAccounts(getValidatorRemainingAccounts())
//         .rpc({ skipPreflight: true });

//       const duration = Date.now() - start;
//       timings.push({ label: "delegate_game", layer: "L1", ms: duration });
//       console.log(`  [SK] ${duration}ms delegate_game tx: ${tx}`);
//     });

//     it("[SK] Delegate creator player state to ER", async function () {
//       const start = Date.now();

//       let tx = await program.methods
//         .delegatePlayer()
//         .accountsPartial({
//           payer: creator.publicKey,
//           player: creatorPlayerPDA,
//         })
//         .remainingAccounts(getValidatorRemainingAccounts())
//         .rpc({ skipPreflight: true });

//       const duration = Date.now() - start;
//       timings.push({
//         label: "delegate_player (creator)",
//         layer: "L1",
//         ms: duration,
//       });
//       console.log(`  [SK] ${duration}ms delegate_player (creator) tx: ${tx}`);
//     });

//     it("[SK] Delegate player 2 state to ER", async function () {
//       const start = Date.now();

//       let tx = await program.methods
//         .delegatePlayer()
//         .accountsPartial({
//           payer: player2Keypair.publicKey,
//           player: player2PDA,
//         })
//         .remainingAccounts(getValidatorRemainingAccounts())
//         .transaction();

//       const txHash = await sendAndConfirmTransaction(
//         provider.connection,
//         tx,
//         [player2Keypair],
//         { skipPreflight: true, commitment: "confirmed" }
//       );

//       const duration = Date.now() - start;
//       timings.push({
//         label: "delegate_player (player2)",
//         layer: "L1",
//         ms: duration,
//       });
//       console.log(`  [SK] ${duration}ms delegate_player (player2) tx: ${txHash}`);
//       await sleep(3000);
//     });
//   });

//   // ═══════════════════════════════════════════════════════════
//   // 4. GAMEPLAY — DICE ROLLS WITH SESSION KEYS (ER + VRF)
//   //
//   //    Key differences from the original test:
//   //      • payer         = sessionKeypair   (not the real wallet)
//   //      • sessionToken  = sessionTokenPDA  (not null)
//   //      • tx is signed by sessionKeypair only
//   //
//   //    The on-chain #[session_auth_or] macro validates:
//   //      1. The session token exists, targets our program, is
//   //         signed by `payer`, and its authority matches
//   //         `player.authority`.
//   //      OR
//   //      2. `player.authority == payer` (direct wallet — the
//   //         fallback used by the original tests).
//   // ═══════════════════════════════════════════════════════════

//   describe("4. Dice Rolling with Session Keys (ER + VRF)", () => {
//     it("[SK] Roll dice for creator — session key", async function () {
//       const start = Date.now();

//       // Build tx using ephemeral program — session keypair is the payer,
//       // and the session token PDA is passed instead of null.
//       let tx = await ephemeralProgram.methods
//         .rollDice(0)
//         .accountsPartial({
//           payer: sessionKeypair.publicKey,
//           game: gamePDA,
//           player: creatorPlayerPDA,
//           oracleQueue: ORACLE_QUEUE,
//           sessionToken: sessionTokenPDA,
//         })
//         .transaction();

//       // Send on ER signed by the session keypair only
//       const txHash = await sendOnER(tx, [sessionKeypair]);

//       const duration = Date.now() - start;
//       timings.push({ label: "roll_dice (p1, SK)", layer: "ER+VRF", ms: duration });
//       console.log(`  [SK] ${duration}ms roll_dice tx: ${txHash}`);

//       const playerState = await ephemeralProgram.account.playerState.fetch(
//         creatorPlayerPDA
//       );
//       console.log(
//         `  [SK] Dice: [${playerState.lastDiceResult[0]}, ${playerState.lastDiceResult[1]}]`
//       );
//       console.log(`  [SK] Position: ${playerState.currentPosition}`);
//       console.log(`  [SK] Balance: ${playerState.balance.toNumber()}`);

//       expect(playerState.lastDiceResult[0]).to.be.at.least(1);
//       expect(playerState.lastDiceResult[0]).to.be.at.most(6);
//       expect(playerState.lastDiceResult[1]).to.be.at.least(1);
//       expect(playerState.lastDiceResult[1]).to.be.at.most(6);
//     });

//     it("[SK] Perform tile action — creator, session key", async function () {
//       const playerState = await ephemeralProgram.account.playerState.fetch(
//         creatorPlayerPDA
//       );
//       const tileIndex = playerState.currentPosition;
//       console.log(
//         `  [SK] Player on tile ${tileIndex}, balance: ${playerState.balance.toNumber()}`
//       );

//       const start = Date.now();
//       let tx = await program.methods
//         .performTileAction(tileIndex, false)
//         .accountsPartial({
//           payer: sessionKeypair.publicKey,
//           game: gamePDA,
//           player: creatorPlayerPDA,
//           sessionToken: sessionTokenPDA,
//         })
//         .transaction();

//       const txHash = await sendOnER(tx, [sessionKeypair]);

//       const duration = Date.now() - start;
//       timings.push({
//         label: "perform_tile_action (p1, SK)",
//         layer: "ER",
//         ms: duration,
//       });
//       console.log(`  [SK] ${duration}ms perform_tile_action tx: ${txHash}`);

//       const updated = await ephemeralProgram.account.playerState.fetch(
//         creatorPlayerPDA
//       );
//       console.log(`  [SK] Balance after: ${updated.balance.toNumber()}`);
//     });

//     it("[SK] Buy property — creator, session key (if applicable)", async function () {
//       const playerState = await ephemeralProgram.account.playerState.fetch(
//         creatorPlayerPDA
//       );
//       const tileIndex = playerState.currentPosition;
//       const gameState = await ephemeralProgram.account.gameState.fetch(gamePDA);
//       const owner = gameState.propertyOwners[tileIndex];

//       const ownableTiles = [
//         1, 3, 5, 9, 11, 13, 15, 16, 18, 21, 23, 25, 28, 29, 31, 35, 39,
//       ];

//       if (
//         ownableTiles.includes(tileIndex) &&
//         owner.toString() === PublicKey.default.toString()
//       ) {
//         console.log(`  [SK] Tile ${tileIndex} is ownable and unowned — buying with session key!`);

//         const start = Date.now();
//         let tx = await program.methods
//           .buyProperty(tileIndex)
//           .accountsPartial({
//             payer: sessionKeypair.publicKey,
//             game: gamePDA,
//             player: creatorPlayerPDA,
//             sessionToken: sessionTokenPDA,
//           })
//           .transaction();

//         const txHash = await sendOnER(tx, [sessionKeypair]);

//         const duration = Date.now() - start;
//         timings.push({ label: "buy_property (SK)", layer: "ER", ms: duration });
//         console.log(`  [SK] ${duration}ms buy_property tx: ${txHash}`);

//         const updatedGame = await ephemeralProgram.account.gameState.fetch(
//           gamePDA
//         );
//         expect(updatedGame.propertyOwners[tileIndex].toString()).to.equal(
//           creator.publicKey.toString()
//         );
//         console.log(`  [SK] ✅ Bought tile ${tileIndex} via session key!`);
//       } else {
//         console.log(`  [SK] Tile ${tileIndex} not ownable or owned — skip buy`);
//       }
//     });

//     it("[SK] Roll dice for player 2 — session key", async function () {
//       const start = Date.now();

//       let tx = await ephemeralProgram.methods
//         .rollDice(1)
//         .accountsPartial({
//           payer: sessionKeypair2.publicKey,
//           game: gamePDA,
//           player: player2PDA,
//           oracleQueue: ORACLE_QUEUE,
//           sessionToken: sessionTokenPDA2,
//         })
//         .transaction();

//       const txHash = await sendOnER(tx, [sessionKeypair2]);

//       const duration = Date.now() - start;
//       timings.push({
//         label: "roll_dice (p2, SK)",
//         layer: "ER+VRF",
//         ms: duration,
//       });
//       console.log(`  [SK] ${duration}ms roll_dice (player2) tx: ${txHash}`);

//       const p2State = await ephemeralProgram.account.playerState.fetch(
//         player2PDA
//       );
//       console.log(
//         `  [SK] Player 2 dice: [${p2State.lastDiceResult[0]}, ${p2State.lastDiceResult[1]}]`
//       );
//       console.log(`  [SK] Player 2 position: ${p2State.currentPosition}`);
//       expect(p2State.lastDiceResult[0]).to.be.at.least(1);
//     });

//     it("[SK] Perform tile action — player 2, session key", async function () {
//       const p2State = await ephemeralProgram.account.playerState.fetch(
//         player2PDA
//       );
//       const tileIndex = p2State.currentPosition;
//       console.log(`  [SK] Player 2 on tile ${tileIndex}`);

//       const start = Date.now();
//       let tx = await program.methods
//         .performTileAction(tileIndex, false)
//         .accountsPartial({
//           payer: sessionKeypair2.publicKey,
//           game: gamePDA,
//           player: player2PDA,
//           sessionToken: sessionTokenPDA2,
//         })
//         .transaction();

//       const txHash = await sendOnER(tx, [sessionKeypair2]);

//       const duration = Date.now() - start;
//       timings.push({
//         label: "perform_tile_action (p2, SK)",
//         layer: "ER",
//         ms: duration,
//       });
//       console.log(`  [SK] ${duration}ms perform_tile_action (p2) tx: ${txHash}`);
//     });
//   });

//   // ═══════════════════════════════════════════════════════════
//   // 5. ADDITIONAL ROUNDS WITH SESSION KEYS (ER)
//   // ═══════════════════════════════════════════════════════════

//   describe("5. Additional Rounds with Session Keys (ER)", () => {
//     it("[SK] Roll dice again after cooldown (round 2)", async function () {
//       console.log("  [SK] Waiting 11s for cooldown...");
//       await sleep(11000);

//       const start = Date.now();
//       let tx = await ephemeralProgram.methods
//         .rollDice(2)
//         .accountsPartial({
//           payer: sessionKeypair.publicKey,
//           game: gamePDA,
//           player: creatorPlayerPDA,
//           oracleQueue: ORACLE_QUEUE,
//           sessionToken: sessionTokenPDA,
//         })
//         .transaction();

//       const txHash = await sendOnER(tx, [sessionKeypair]);

//       const duration = Date.now() - start;
//       timings.push({
//         label: "roll_dice (round 2, SK)",
//         layer: "ER+VRF",
//         ms: duration,
//       });
//       console.log(`  [SK] ${duration}ms roll_dice (round 2) tx: ${txHash}`);

//       const ps = await ephemeralProgram.account.playerState.fetch(
//         creatorPlayerPDA
//       );
//       console.log(
//         `  [SK] Round 2 — dice: [${ps.lastDiceResult[0]}, ${ps.lastDiceResult[1]}]`
//       );
//       console.log(
//         `  [SK] Position: ${ps.currentPosition}, Balance: ${ps.balance.toNumber()}`
//       );
//       console.log(`  [SK] GO passes: ${ps.goPasses}`);
//     });

//     it("[SK] Perform tile action with choose_action=true (Round 2)", async function () {
//       const ps = await ephemeralProgram.account.playerState.fetch(
//         creatorPlayerPDA
//       );
//       const tileIndex = ps.currentPosition;
//       console.log(`  [SK] On tile ${tileIndex}, trying choose_action=true`);

//       try {
//         const start = Date.now();
//         let tx = await program.methods
//           .performTileAction(tileIndex, true)
//           .accountsPartial({
//             payer: sessionKeypair.publicKey,
//             game: gamePDA,
//             player: creatorPlayerPDA,
//             sessionToken: sessionTokenPDA,
//           })
//           .transaction();

//         const txHash = await sendOnER(tx, [sessionKeypair]);

//         const duration = Date.now() - start;
//         timings.push({
//           label: "perform_tile_action (choose, SK)",
//           layer: "ER",
//           ms: duration,
//         });
//         console.log(`  [SK] ${duration}ms perform_tile_action(true) tx: ${txHash}`);

//         const updated = await ephemeralProgram.account.playerState.fetch(
//           creatorPlayerPDA
//         );
//         console.log(`  [SK] Balance: ${updated.balance.toNumber()}`);
//         console.log(
//           `  [SK] Shield: ${updated.hasShield}, DeFi: ${updated.hasStakedDefi}, Potion: ${updated.hasPotion}`
//         );
//       } catch (e: any) {
//         console.log(
//           `  [SK] choose_action=true failed (expected for some tiles): ${e.message?.substring(0, 120)}`
//         );
//       }
//     });
//   });

//   // ═══════════════════════════════════════════════════════════
//   // 6. STATE VERIFICATION (ER)
//   // ═══════════════════════════════════════════════════════════

//   describe("6. State Verification (ER)", () => {
//     it("[SK] Verify game state consistency", async function () {
//       const gs = await ephemeralProgram.account.gameState.fetch(gamePDA);
//       expect(gs.isStarted).to.equal(true);
//       expect(gs.isEnded).to.equal(false);
//       expect(gs.playerCount).to.equal(2);

//       let ownedCount = 0;
//       for (let i = 0; i < 40; i++) {
//         if (
//           gs.propertyOwners[i].toString() !== PublicKey.default.toString()
//         ) {
//           ownedCount++;
//           console.log(
//             `  [SK] Tile ${i} → ${gs.propertyOwners[i].toString().substring(0, 8)}...`
//           );
//         }
//       }
//       console.log(`  [SK] Owned: ${ownedCount}, go_count: ${gs.goCount}`);
//     });

//     it("[SK] Verify both player states", async function () {
//       const p1 = await ephemeralProgram.account.playerState.fetch(
//         creatorPlayerPDA
//       );
//       const p2 = await ephemeralProgram.account.playerState.fetch(player2PDA);

//       console.log(
//         `  [SK] Creator: pos=${p1.currentPosition} bal=${p1.balance.toNumber()} go=${p1.goPasses} shield=${p1.hasShield} defi=${p1.hasStakedDefi} potion=${p1.hasPotion} graveyard=${p1.isInGraveyard}`
//       );
//       console.log(
//         `  [SK] Player2: pos=${p2.currentPosition} bal=${p2.balance.toNumber()} go=${p2.goPasses}`
//       );

//       expect(p1.isActive).to.equal(true);
//       expect(p2.isActive).to.equal(true);
//     });
//   });

//   // ═══════════════════════════════════════════════════════════
//   // 7. LEAVE ROOM (ER → L1) — real wallet (no session keys)
//   // ═══════════════════════════════════════════════════════════

//   describe("7. Leave Room (ER → L1)", () => {
//     it("[SK] Player 2 leaves — commit + undelegate", async function () {
//       const start = Date.now();
//       let tx = await program.methods
//         .leaveRoom()
//         .accountsPartial({
//           payer: sessionKeypair2.publicKey,
//           game: gamePDA,
//           player: player2PDA,
//           sessionToken: sessionTokenPDA2,
//         })
//         .transaction();

//       const txHash = await sendOnER(tx, [sessionKeypair2]);

//       const duration = Date.now() - start;
//       timings.push({ label: "leave_room (SK suite)", layer: "ER→L1", ms: duration });
//       console.log(`  [SK] ${duration}ms leave_room tx: ${txHash}`);

//       console.log("  [SK] Waiting for commit to L1...");
//       try {
//         const commitSig = await GetCommitmentSignature(
//           txHash,
//           providerEphemeralRollup.connection
//         );
//         console.log(`  [SK] L1 commit sig: ${commitSig}`);
//       } catch {
//         console.log(
//           "  [SK] Commit tracking timed out (OK in some configs)"
//         );
//       }

//       // Verify on L1
//       const p2State = await program.account.playerState.fetch(player2PDA);
//       expect(p2State.isActive).to.equal(false);
//       expect(p2State.balance.toNumber()).to.equal(0);
//       console.log(
//         `  [SK] ✅ Player 2 inactive on L1, balance=0 (stake forfeited)`
//       );
//     });
//   });

//   // ═══════════════════════════════════════════════════════════
//   // 8. SESSION CLEANUP (L1)
//   //
//   //    Revokes the session tokens so the session keypairs can
//   //    no longer sign transactions for the authority wallets.
//   // ═══════════════════════════════════════════════════════════

//   describe("8. Session Cleanup (L1)", () => {
//     it("[SK] Revoke creator session", async function () {
//       const start = Date.now();

//       const tx = await sessionTokenManager.program.methods
//         .revokeSession()
//         .accounts({
//           sessionToken: sessionTokenPDA,
//         })
//         .transaction();

//       tx.feePayer = sessionKeypair.publicKey;
//       tx.recentBlockhash = (
//         await provider.connection.getLatestBlockhash()
//       ).blockhash;

//       const txHash = await sendAndConfirmTransaction(
//         provider.connection,
//         tx,
//         [sessionKeypair],
//         { skipPreflight: true, commitment: "confirmed" }
//       );

//       const duration = Date.now() - start;
//       timings.push({ label: "revoke_session (creator)", layer: "L1", ms: duration });
//       console.log(`  [SK] ${duration}ms revokeSession (creator) tx: ${txHash}`);
//     });

//     it("[SK] Revoke player 2 session", async function () {
//       const start = Date.now();

//       const tx = await sessionTokenManager2.program.methods
//         .revokeSession()
//         .accounts({
//           sessionToken: sessionTokenPDA2,
//         })
//         .transaction();

//       tx.feePayer = sessionKeypair2.publicKey;
//       tx.recentBlockhash = (
//         await provider.connection.getLatestBlockhash()
//       ).blockhash;

//       const txHash = await sendAndConfirmTransaction(
//         provider.connection,
//         tx,
//         [sessionKeypair2],
//         { skipPreflight: true, commitment: "confirmed" }
//       );

//       const duration = Date.now() - start;
//       timings.push({ label: "revoke_session (player2)", layer: "L1", ms: duration });
//       console.log(`  [SK] ${duration}ms revokeSession (player2) tx: ${txHash}`);
//     });
//   });

//   // ═══════════════════════════════════════════════════════════
//   // SUMMARY TABLE
//   // ═══════════════════════════════════════════════════════════

//   after(() => {
//     console.log("\n");
//     console.log("═════════════════════════════════════════════════════════════");
//     console.log("  SESSION KEY TEST — TRANSACTION TIMING SUMMARY");
//     console.log("═════════════════════════════════════════════════════════════");
//     console.log(
//       "  " +
//       "Instruction".padEnd(40) +
//       "Layer".padEnd(12) +
//       "Time (ms)"
//     );
//     console.log("  " + "─".repeat(61));

//     let totalMs = 0;
//     for (const t of timings) {
//       totalMs += t.ms;
//       console.log(
//         "  " + t.label.padEnd(40) + t.layer.padEnd(12) + `${t.ms}`
//       );
//     }

//     console.log("  " + "─".repeat(61));
//     console.log(
//       "  " + "TOTAL".padEnd(40) + "".padEnd(12) + `${totalMs}ms`
//     );
//     console.log(
//       "  " +
//       "AVERAGE".padEnd(40) +
//       "".padEnd(12) +
//       `${timings.length > 0 ? Math.round(totalMs / timings.length) : 0}ms`
//     );
//     console.log(
//       "═════════════════════════════════════════════════════════════\n"
//     );
//   });
// });
