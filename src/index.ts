import { Keypair } from "@solana/web3.js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import nacl from "tweetnacl";
import { config, SIGN_MESSAGE, Token } from "./constants";
import { deriveKeypairsFromSignature } from "./deriveKeypairs";
import { getNullifiers } from "./fetch-utxos";
import { getUserTransactions } from "./get-user-transactions";
import { getTransactionAndUtxoGroups } from "./fetch-utxos";
import { decryptLeaves } from "./decrypt/leavesDecryptionWorker";
import { fetchAndSortLeavesLegacy, sortLeaves } from "./decrypt/utxoHelper";
import { UtxoService } from "./services/utxoService";
import { ProcessedUtxo } from "./types";
import * as fs from "fs";
import { loadTransactions } from "./utils/loadTransactions";

async function fetchLeafAccounts() {
  return {
    solLegacy: await fetchAndSortLeavesLegacy({
      token: Token.SOL,
      connection: config.connection,
    }),
    usdcLegacy: await fetchAndSortLeavesLegacy({
      token: Token.USDC,
      connection: config.connection,
    }),
    sol: await sortLeaves({
      token: Token.SOL,
      connection: config.connection,
    }),
    usdc: await sortLeaves({
      token: Token.USDC,
      connection: config.connection,
    }),
  };
}

async function decryptUtxos(leafAccounts: any, keypairs: any) {
  const decryptedLeaves = decryptLeaves(
    {
      sol: leafAccounts.sol.sortedLeafAccounts,
      usdc: leafAccounts.usdc.sortedLeafAccounts,
    },
    keypairs.viewingKeypair!,
    keypairs.viewingKeypairLegacy!
  );

  const decryptedLeavesLegacy = decryptLeaves(
    {
      sol: leafAccounts.solLegacy.sortedLeafAccounts,
      usdc: leafAccounts.usdcLegacy.sortedLeafAccounts,
    },
    keypairs.viewingKeypair!,
    keypairs.viewingKeypairLegacy!
  );

  return { decryptedLeaves, decryptedLeavesLegacy };
}

async function main() {
  // Initialize keypairs
  const keypair = Keypair.fromSecretKey(bs58.decode(config.base58Keypair));
  const signature = nacl.sign.detached(
    new TextEncoder().encode(SIGN_MESSAGE),
    keypair.secretKey
  );

  const keypairs = deriveKeypairsFromSignature(signature);

  const allTransactions = await loadTransactions();

  // Fetch nullifiers
  const nullifiers = await getNullifiers(config.connection);

  // process leaves
  const leafAccounts = await fetchLeafAccounts();

  // Decrypt UTXOs
  const { decryptedLeaves, decryptedLeavesLegacy } = await decryptUtxos(
    leafAccounts,
    keypairs
  );

  // Process UTXOs
  const spentUtxos: ProcessedUtxo[] = [];
  UtxoService.processUtxos(
    decryptedLeavesLegacy.decryptedUtxoBytes.usdc,
    Token.USDC,
    keypairs,
    nullifiers,
    leafAccounts,
    spentUtxos
  );

  UtxoService.processUtxos(
    decryptedLeavesLegacy.decryptedUtxoBytes.sol,
    Token.SOL,
    keypairs,
    nullifiers,
    leafAccounts,
    spentUtxos
  );

  UtxoService.processUtxos(
    decryptedLeaves.decryptedUtxoBytes.usdc,
    Token.USDC,
    keypairs,
    nullifiers,
    leafAccounts,
    spentUtxos
  );

  UtxoService.processUtxos(
    decryptedLeaves.decryptedUtxoBytes.sol,
    Token.SOL,
    keypairs,
    nullifiers,
    leafAccounts,
    spentUtxos
  );

  // Get and enrich transactions
  const transactions = getUserTransactions(allTransactions, spentUtxos);
  console.log("User Transactions found:", transactions.length);

  const enrichedUtxos = getTransactionAndUtxoGroups(
    transactions,
    spentUtxos.map((u) => u.utxo)
  );
  console.log("Enriched UTXOs:", enrichedUtxos.length);

  // write all transactions and enriched utxos to files
  fs.writeFileSync("transactions.json", JSON.stringify(transactions, null, 2));
  fs.writeFileSync(
    "enrichedUtxos.json",
    JSON.stringify(enrichedUtxos, null, 2)
  );
  console.log(
    "Wrote transactions and enriched utxos to transactions.json and enrichedUtxos.json"
  );
}

main().catch(console.error);
