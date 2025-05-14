// overall flow

// - derive all keypairs
// - fetch user account (check: keypairs match onchain pubkeys)

// - fetch all nullifiers
// - try decrypt all
// - decrypted -> create utxo
// - fetch all txs from history
// - enrich with tx info (inutxo,oututxo)
// - log all

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  deriveKeypairsFromSignature,
  getSpendingKeypair,
} from "./deriveKeypairs";
import { getUserAccount } from "./get-user-account";
import { getNullifiers } from "./fetch-utxos";
import { Utxo } from "./utxo";
import { getUserTransactions, UserUtxo } from "./get-user-transactions";
import { getTransactionAndUtxoGroups } from "./fetch-utxos";
import dotenv from "dotenv";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { sign } from "crypto";
import nacl from "tweetnacl";
import { SIGN_MESSAGE, Token } from "./constants";
import { decryptLeaves } from "./decrypt/leavesDecryptionWorker";
import { fetchAndSortLeavesLegacy } from "./decrypt/utxoHelper";
import { isUtxoNullified } from "./decrypt/util";

dotenv.config();

const RPC_API_URL = process.env.RPC_API_URL!;
const BASE58_KEYPAIR = process.env.BASE58_KEYPAIR!;

if (!RPC_API_URL || !BASE58_KEYPAIR) {
  throw new Error("RPC_API_URL and BASE58_KEYPAIR must be set in .env");
}

export async function fetchUserHistory(
  connection: Connection,
  signature: Uint8Array,
  publicKey: PublicKey
) {
  // 1. Derive all keypairs
  const keypairs = deriveKeypairsFromSignature(signature);

  console.log("User Keypairs:", keypairs);

  // 2. Fetch user account and verify keypairs match onchain pubkeys
  const userAccountData = await getUserAccount(connection, publicKey);
  console.log("User Account Data:", userAccountData);

  // 3. Fetch all nullifiers
  const nullifiers = await getNullifiers(connection);
  console.log("Nullifiers:", nullifiers.length);

  // Fetch leaf accounts for both tokens
  const leafAccounts = {
    sol: await fetchAndSortLeavesLegacy({ token: Token.SOL, connection }),
    usdc: await fetchAndSortLeavesLegacy({ token: Token.USDC, connection }),
  };

  console.log("Sol Leaf Accounts:", leafAccounts.sol.sortedLeafAccounts.length);
  console.log(
    "USDC Leaf Accounts:",
    leafAccounts.usdc.sortedLeafAccounts.length
  );

  // Decrypt leaves using both legacy and current encryption
  const recipientEncryptionKeypair = keypairs.viewingKeypair;
  const recipientEncryptionKeypairLegacy = keypairs.viewingKeypairLegacy;

  const decryptedLeaves = decryptLeaves(
    {
      sol: leafAccounts.sol.sortedLeafAccounts,
      usdc: leafAccounts.usdc.sortedLeafAccounts,
    },
    recipientEncryptionKeypair!,
    recipientEncryptionKeypairLegacy!
  );

  console.log(
    "Decrypted SOL UTXOs:",
    decryptedLeaves.decryptedUtxoBytes.sol.length
  );
  console.log(
    "Decrypted USDC UTXOs:",
    decryptedLeaves.decryptedUtxoBytes.usdc.length
  );

  // Process decrypted UTXOs
  const spentUtxos: UserUtxo[] = [];

  // Helper function to process UTXOs
  const processUtxos = (utxos: any[], token: Token) => {
    utxos.forEach((utxo) => {
      const processedUtxo = {
        token,
        utxo: Utxo.bytesToUtxo(
          utxo.utxo.buf,
          keypairs.spendingKeypairLegacy!,
          utxo.utxo.index
        ),
        spent: false,
      };

      // Check if UTXO is spent using the appropriate leaf accounts
      processedUtxo.spent = isUtxoNullified(
        processedUtxo.utxo,
        nullifiers,
        leafAccounts[
          token.toLowerCase() as "sol" | "usdc"
        ].sortedLeafAccounts.map((acc) => acc.leaves.left.toString())
      );

      spentUtxos.push(processedUtxo);
    });
  };

  // Process both SOL and USDC UTXOs
  processUtxos(decryptedLeaves.decryptedUtxoBytes.sol, Token.SOL);
  processUtxos(decryptedLeaves.decryptedUtxoBytes.usdc, Token.USDC);

  // 5. Fetch all transactions from history
  const transactions = getUserTransactions([], spentUtxos);
  console.log("Transactions:", transactions);

  // 6. Enrich with transaction info (inutxo, oututxo)
  const enrichedUtxos = getTransactionAndUtxoGroups(
    transactions,
    spentUtxos.map((u) => u.utxo)
  );

  console.log("Enriched UTXOs:", enrichedUtxos);

  return {
    keypairs,
    userAccountData,
    nullifiers,
    spentUtxos,
    transactions,
    enrichedUtxos,
  };
}

(async () => {
  const connection = new Connection(RPC_API_URL);

  const keypair = Keypair.fromSecretKey(bs58.decode(BASE58_KEYPAIR));
  const publicKey = keypair.publicKey;

  const signature = nacl.sign.detached(
    new TextEncoder().encode(SIGN_MESSAGE),
    keypair.secretKey
  );

  const result = await fetchUserHistory(connection, signature, publicKey);
  console.log(result);
})();
