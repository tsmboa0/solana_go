import { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { readFileSync, writeFileSync, existsSync } from "fs";

/**
 * Initialize or load a session signer keypair.
 * Stores the keypair in .env for reuse across test runs.
 */
export function initializeSessionSignerKeypair(): Keypair {
    let signer: Keypair;

    if (!process.env.SESSION_SIGNER_PRIVATE_KEY) {
        signer = Keypair.generate();
        const envContent = `SESSION_SIGNER_PRIVATE_KEY=[${signer.secretKey.toString()}]\n`;
        if (existsSync(".env")) {
            const existing = readFileSync(".env", "utf-8");
            writeFileSync(".env", existing + envContent);
        } else {
            writeFileSync(".env", envContent);
        }
    } else {
        const secret = JSON.parse(
            process.env.SESSION_SIGNER_PRIVATE_KEY ?? ""
        ) as number[];
        const secretKey = Uint8Array.from(secret);
        signer = Keypair.fromSecretKey(secretKey);
    }

    return signer;
}

/**
 * Airdrop SOL if balance is below threshold.
 * Only works on devnet/testnet/localnet.
 */
export async function airdropSolIfNeeded(
    connection: Connection,
    pubkey: PublicKey,
    amount: number,
    threshold: number
) {
    if (
        connection.rpcEndpoint.includes("dev") ||
        connection.rpcEndpoint.includes("test") ||
        connection.rpcEndpoint.includes("local") ||
        connection.rpcEndpoint.includes("http://")
    ) {
        const balance = await connection.getBalance(pubkey);
        console.log(
            "Current balance is",
            balance / LAMPORTS_PER_SOL,
            " SOL"
        );
        if (balance < threshold * LAMPORTS_PER_SOL) {
            console.log(`Airdropping ${amount} SOL to ${pubkey.toString()}...`);
            try {
                const sig = await connection.requestAirdrop(
                    pubkey,
                    amount * LAMPORTS_PER_SOL
                );
                await connection.confirmTransaction(sig, "confirmed");
                console.log(`Airdrop of ${amount} SOL successful.`);
            } catch (e) {
                console.error("Airdrop failed:", e);
            }
        }
    }
}

/**
 * Wait for a specified time in ms.
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
