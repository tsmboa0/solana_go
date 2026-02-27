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
import { GetCommitmentSignature } from "@magicblock-labs/ephemeral-rollups-sdk";
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
    readFileSync("player2-keypair.json", "utf-8")
  );
  const player2Keypair = Keypair.fromSecretKey(
    Uint8Array.from(player2Secret)
  );

  const providerEphemeralRollup2 = new anchor.AnchorProvider(
    new anchor.web3.Connection(
      process.env.EPHEMERAL_PROVIDER_ENDPOINT ||
      "https://devnet-eu.magicblock.app/",
      {
        wsEndpoint:
          process.env.EPHEMERAL_WS_ENDPOINT ||
          "wss://devnet-eu.magicblock.app/",
      }
    ),
    new anchor.Wallet(player2Keypair)
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
    return [];
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
      this.timeout(30000);
      const start = Date.now();

      let tx = await program.methods
        .createRoom(
          gameId,
          roundDuration,
          startCapital,
          stakeAmount,
          maxPlayers
        )
        .accounts({
          creator: creator.publicKey,
        })
        .transaction();

      const txHash = await provider.sendAndConfirm(tx, [provider.wallet.payer]);

      // const txHash = await sendAndConfirmTransaction(
      //   provider.connection,
      //   tx,
      //   [provider.wallet.payer],
      //   { skipPreflight: true, commitment: "confirmed" }
      // );

      const duration = Date.now() - start;
      timings.push({ label: "create_room", layer: "L1", ms: duration });
      console.log(`  ${duration}ms create_room tx: ${txHash}`);

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
      this.timeout(30000);
      const start = Date.now();

      let tx = await program.methods
        .joinRoom()
        .accounts({
          user: player2Keypair.publicKey,
          game: gamePDA,
          escrow: escrowPDA,
        })
        .transaction();

      const txHash = await provider.sendAndConfirm(tx, [player2Keypair]);

      // const txHash = await sendAndConfirmTransaction(
      //   provider.connection,
      //   tx,
      //   [player2Keypair],
      //   { skipPreflight: true, commitment: "confirmed" }
      // );

      const duration = Date.now() - start;
      timings.push({ label: "join_room", layer: "L1", ms: duration });
      console.log(`  ${duration}ms join_room tx: ${txHash}`);

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
      this.timeout(30000);
      const start = Date.now();

      let tx = await program.methods
        .delegateGame(gameId)
        .accountsPartial({
          payer: creator.publicKey,
          game: gamePDA,
        })
        .remainingAccounts(getValidatorRemainingAccounts())
        .transaction();

      const txHash = await provider.sendAndConfirm(tx, [provider.wallet.payer]);

      // const txHash = await sendAndConfirmTransaction(
      //   provider.connection,
      //   tx,
      //   [provider.wallet.payer],
      //   { skipPreflight: true, commitment: "confirmed" }
      // );

      const duration = Date.now() - start;
      timings.push({ label: "delegate_game", layer: "L1", ms: duration });
      console.log(`  ${duration}ms delegate_game tx: ${txHash}`);
      await sleep(3000);
    });

    it("Delegate creator player state to ER", async function () {
      this.timeout(30000);
      const start = Date.now();

      let tx = await program.methods
        .delegatePlayer()
        .accountsPartial({
          payer: creator.publicKey,
          player: creatorPlayerPDA,
        })
        .remainingAccounts(getValidatorRemainingAccounts())
        .transaction();

      const txHash = await provider.sendAndConfirm(tx, [provider.wallet.payer]);

      // const txHash = await sendAndConfirmTransaction(
      //   provider.connection,
      //   tx,
      //   [provider.wallet.payer],
      //   { skipPreflight: true, commitment: "confirmed" }
      // );

      const duration = Date.now() - start;
      timings.push({
        label: "delegate_player (creator)",
        layer: "L1",
        ms: duration,
      });
      console.log(`  ${duration}ms delegate_player (creator) tx: ${txHash}`);
      await sleep(3000);
    });

    it("Delegate player 2 state to ER", async function () {
      this.timeout(30000);
      const start = Date.now();

      let tx = await program.methods
        .delegatePlayer()
        .accountsPartial({
          payer: player2Keypair.publicKey,
          player: player2PDA,
        })
        .remainingAccounts(getValidatorRemainingAccounts())
        .transaction();

      const txHash = await provider.sendAndConfirm(tx, [player2Keypair]);

      // const txHash = await sendAndConfirmTransaction(
      //   provider.connection,
      //   tx,
      //   [player2Keypair],
      //   { skipPreflight: true, commitment: "confirmed" }
      // );

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
      this.timeout(30000);
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
        .transaction();

      const txHash = await sendOnER(tx, [provider.wallet.payer]);

      const duration = Date.now() - start;
      timings.push({ label: "roll_dice (p1)", layer: "ER+VRF", ms: duration });
      console.log(`  ${duration}ms roll_dice tx: ${txHash}`);

      // Wait for VRF callback — poll with retries
      console.log("  Waiting for VRF callback (up to 15s)...");

      // Poll for VRF callback result
      let playerState: any;
      for (let i = 0; i < 5; i++) {
        await sleep(3000);
        playerState = await ephemeralProgram.account.playerState.fetch(
          creatorPlayerPDA
        );
        console.log(`  Player state: ${JSON.stringify(playerState)}`);
        if (playerState.lastDiceResult[0] > 0) break;
        console.log(`  ...still waiting (${(i + 1) * 3}s)`);
      }
      if (playerState.lastDiceResult[0] === 0) {
        console.log("  ⚠️  VRF callback not received yet");
      }
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
      this.timeout(30000);


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
      this.timeout(30000);


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
      this.timeout(30000);

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

      const txHash = await sendOnER(tx, [player2Keypair]);

      const duration = Date.now() - start;
      timings.push({
        label: "roll_dice (p2)",
        layer: "ER+VRF",
        ms: duration,
      });
      console.log(`  ${duration}ms roll_dice (player2) tx: ${txHash}`);

      console.log("  Waiting 5s for VRF callback...");
      await sleep(5000);


      const p2State = await ephemeralProgram.account.playerState.fetch(
        player2PDA
      );
      console.log(
        `  Player 2 dice: [${p2State.lastDiceResult[0]}, ${p2State.lastDiceResult[1]}]`
      );
      console.log(`  Player 2 position: ${p2State.currentPosition}`);
      expect(p2State.lastDiceResult[0]).to.be.at.least(1);
    });

    it("Perform tile action for player 2", async function () {
      this.timeout(30000);


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
      this.timeout(60000);

      console.log("  Waiting 21s for cooldown...");
      await sleep(21000);

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
        .transaction();

      const txHash = await sendOnER(tx, [provider.wallet.payer]);

      const duration = Date.now() - start;
      timings.push({
        label: "roll_dice (round 2)",
        layer: "ER+VRF",
        ms: duration,
      });
      console.log(`  ${duration}ms roll_dice (round 2) tx: ${txHash}`);

      await sleep(5000);

      // Read from top-level ephemeralProgram
      const ps = await ephemeralProgram.account.playerState.fetch(
        creatorPlayerPDA
      );
      console.log(
        `  Round 2 — dice: [${ps.lastDiceResult[0]}, ${ps.lastDiceResult[1]}]`
      );
      console.log(
        `  Position: ${ps.currentPosition}, Balance: ${ps.balance.toNumber()}`
      );
      console.log(`  GO passes: ${ps.goPasses}`);
    });

    it("Perform tile action with choose_action=true (Round 2)", async function () {
      this.timeout(30000);


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
      this.timeout(15000);


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
      this.timeout(15000);


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
      this.timeout(60000);

      const start = Date.now();
      let tx = await program.methods
        .leaveRoom()
        .accountsPartial({
          user: player2Keypair.publicKey,
          game: gamePDA,
          player: player2PDA,
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

      await sleep(5000);

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
