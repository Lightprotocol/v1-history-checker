import "dotenv/config.js";
import {
  ConfirmedSignatureInfo,
  Connection,
  PublicKey,
  TokenBalance,
  TransactionResponse,
  ParsedTransactionWithMeta,
  ParsedMessageAccount,
} from "@solana/web3.js";
import {
  MERKLE_TREE_PDA_PUBKEY,
  MERKLE_TREE_PDA_PUBKEY_USDC,
  TOKEN_POOL_PUBKEY,
  TOKEN_POOL_PUBKEY_USDC,
  INDEXER_FEE,
  INDEXER_FEE_USDC,
  Token,
  TxType,
  LEAVES_PDA_RENT,
  PLUS_FEE_ATA,
  NULLIFIER_PDA_RENT,
  PLUS_FEE_ATA_OLD,
  INDEXER_FEE_USDC_OLD,
  INDEXER_FEE_OLD,
  INDEXER_FEE_USDC_OLD_2,
  PLUS_FEE_ATA_OLD_2,
} from "./constants";
import { toFixedHex } from "./utils";
import * as fs from "fs/promises";
import * as path from "path";
import { RateLimiter } from "limiter";

// Import U64 from n64
const { U64 } = require("n64");

export type LightToken = "SOL" | "USDC" | "ALL";

export type LightTransaction = {
  amount: number;
  blockTime: number;
  slot: number;
  signer: string;
  signature: string;
  to: string;
  from: string;
  type: string;
  owner: string;
  accountKeys: string[];
  leaves: {
    pda: string;
    commitments: string[];
    data: number[];
    index?: string;
  };
  token: string;
  nullifiers: string[];
  isComplete: boolean;
};

const isUnshield = (amount: number) => amount < 0;
const isShield = (amount: number) => amount > 0;

// Helper function to safely get public key
function getPublicKey(key: PublicKey | ParsedMessageAccount): PublicKey {
  if (key instanceof PublicKey) return key;
  return new PublicKey(key.pubkey);
}

// Helper function to safely get base58
function getBase58(key: PublicKey | ParsedMessageAccount): string {
  if (key instanceof PublicKey) return key.toBase58();
  return key.pubkey.toBase58();
}

// Helper function to convert account keys to PublicKey array
function convertToPublicKeys(
  accountKeys: (PublicKey | ParsedMessageAccount)[]
): PublicKey[] {
  return accountKeys.map((key) => getPublicKey(key));
}

function getTokenPoolIndex(
  accountKeys: (PublicKey | ParsedMessageAccount)[],
  tokenPool: PublicKey
) {
  const i = accountKeys.findIndex((item) => {
    const pubkey = getPublicKey(item);
    return pubkey.toBase58() === tokenPool.toBase58();
  });
  return i;
}

function getMerkleTreeIndex(
  accountKeys: (PublicKey | ParsedMessageAccount)[],
  merkleTreePda: PublicKey
) {
  const i = accountKeys.findIndex((item) => {
    const pubkey = getPublicKey(item);
    return pubkey.toBase58() === merkleTreePda.toBase58();
  });
  return i;
}

function getAmount(postBalances: number[], preBalances: number[], i: number) {
  if (i === -1) return 0;
  return postBalances[i] - preBalances[i];
}

function findSolUnshieldRecipient(
  tx: ParsedTransactionWithMeta,
  unshieldAmount: number,
  fee: number
): string | undefined {
  if (!tx.meta) return undefined;

  let toIndex = tx.meta!.postBalances.findIndex((el, i) => {
    return (
      tx.meta!.postBalances[i] - tx.meta!.preBalances[i] ===
      (unshieldAmount + fee) * -1
    );
  });

  fee = INDEXER_FEE_OLD;
  toIndex = tx.meta!.postBalances.findIndex((el, i) => {
    return (
      tx.meta!.postBalances[i] - tx.meta!.preBalances[i] ===
      (unshieldAmount + fee) * -1
    );
  });

  // support legacy fees (0)
  if (toIndex === -1) {
    toIndex = tx.meta!.postBalances.findIndex((el, i) => {
      return (
        tx.meta!.postBalances[i] - tx.meta!.preBalances[i] ===
        unshieldAmount * -1
      );
    });
  }

  if (toIndex === -1) return undefined;
  return getBase58(tx.transaction.message.accountKeys[toIndex]);
}

function findSplUnshieldRecipient(
  tx: ParsedTransactionWithMeta,
  unshieldAmount: number,
  fee: number
): string | undefined {
  if (!tx.meta) return undefined;
  if (!tx.meta.postTokenBalances || !tx.meta.preTokenBalances) return undefined;

  const { postTokenBalances, preTokenBalances } = tx.meta;

  let toIndex = postTokenBalances.findIndex((el, i) => {
    return (
      Number(postTokenBalances[i].uiTokenAmount.amount) -
        Number(preTokenBalances[i].uiTokenAmount.amount) ===
      (unshieldAmount + fee) * -1
    );
  });

  if (toIndex === -1) {
    // support fees+ata fees (after 11dec)
    toIndex = postTokenBalances.findIndex((el, i) => {
      return (
        Number(postTokenBalances[i].uiTokenAmount.amount) -
          Number(preTokenBalances[i].uiTokenAmount.amount) ===
        (unshieldAmount + fee + PLUS_FEE_ATA) * -1
      );
    });
  }

  if (toIndex === -1) {
    // support legacy fees (0)
    toIndex = postTokenBalances.findIndex((el, i) => {
      return (
        Number(postTokenBalances[i].uiTokenAmount.amount) -
          Number(preTokenBalances[i].uiTokenAmount.amount) ===
        unshieldAmount * -1
      );
    });
  }

  /// old fee indexing support
  fee = INDEXER_FEE_USDC_OLD;

  toIndex = postTokenBalances.findIndex((el, i) => {
    return (
      Number(postTokenBalances[i].uiTokenAmount.amount) -
        Number(preTokenBalances[i].uiTokenAmount.amount) ===
      (unshieldAmount + fee) * -1
    );
  });

  if (toIndex === -1) {
    // support fees+ata fees OLD
    toIndex = postTokenBalances.findIndex((el, i) => {
      return (
        Number(postTokenBalances[i].uiTokenAmount.amount) -
          Number(preTokenBalances[i].uiTokenAmount.amount) ===
        (unshieldAmount + fee + PLUS_FEE_ATA_OLD) * -1
      );
    });
  }

  /// old fee indexing support 2 (til 13dec)
  fee = INDEXER_FEE_USDC_OLD_2;

  toIndex = postTokenBalances.findIndex((el, i) => {
    return (
      Number(postTokenBalances[i].uiTokenAmount.amount) -
        Number(preTokenBalances[i].uiTokenAmount.amount) ===
      (unshieldAmount + fee) * -1
    );
  });

  if (toIndex === -1) {
    // support fees+ata fees OLD
    toIndex = postTokenBalances.findIndex((el, i) => {
      return (
        Number(postTokenBalances[i].uiTokenAmount.amount) -
          Number(preTokenBalances[i].uiTokenAmount.amount) ===
        (unshieldAmount + fee + PLUS_FEE_ATA_OLD_2) * -1
      );
    });
  }

  if (toIndex === -1) return undefined;
  return getBase58(tx.transaction.message.accountKeys[toIndex]);
}

const isLastTx = (
  accountKeys: PublicKey[],
  tokenPool: PublicKey,
  merkleTreePda: PublicKey
) => {
  let tokenPoolIndex = getTokenPoolIndex(accountKeys, tokenPool);
  let merkleTreeAccountIndex = getMerkleTreeIndex(accountKeys, merkleTreePda);
  if (tokenPoolIndex !== -1 && merkleTreeAccountIndex !== -1) return true;
  return false;
};

const limiter = new RateLimiter({
  tokensPerInterval: 100,
  interval: "second",
});

export async function parseTransactions({
  tx,
  transactions,
  connection,
  token,
}: {
  tx: ParsedTransactionWithMeta;
  transactions: LightTransaction[];
  connection: Connection;
  token: LightToken;
}) {
  if (!tx || !tx.meta || tx.meta.err) return;

  const signature = tx.transaction.signatures[0];
  let tokenPool = TOKEN_POOL_PUBKEY;
  let fee = INDEXER_FEE;

  if (token === Token.USDC) {
    tokenPool = TOKEN_POOL_PUBKEY_USDC;
    fee = INDEXER_FEE_USDC;
  }

  // Convert account keys to PublicKey array for compatibility
  const accountKeys = tx.transaction.message.accountKeys;
  const publicKeys = convertToPublicKeys(accountKeys);

  const i = getTokenPoolIndex(accountKeys, tokenPool);
  const isTokenPool = (balance: TokenBalance): boolean =>
    balance.accountIndex === i;

  let amount = getAmount(tx.meta.postBalances, tx.meta.preBalances, i);
  let isComplete = true;
  let from: string | undefined;
  let to: string | undefined;
  let type: string | undefined;

  switch (token) {
    case Token.SOL:
      if (isUnshield(amount)) {
        type = TxType.UNSHIELD;
        from = TOKEN_POOL_PUBKEY!.toBase58();
        token = Token.SOL;
        to = findSolUnshieldRecipient(tx, amount, fee);
      } else if (isShield(amount)) {
        type = TxType.SHIELD;
        token = Token.SOL;
        from = getBase58(accountKeys[0]);
        to = TOKEN_POOL_PUBKEY!.toBase58();
      }
      break;
    case Token.USDC:
      if (!isLastTx(publicKeys, tokenPool!, MERKLE_TREE_PDA_PUBKEY_USDC!)) {
        return;
      }
      try {
        const postBalance = tx.meta.postTokenBalances?.find(isTokenPool);
        const preBalance = tx.meta.preTokenBalances?.find(isTokenPool);
        if (postBalance && preBalance) {
          amount =
            Number(postBalance.uiTokenAmount.amount) -
            Number(preBalance.uiTokenAmount.amount);
        }
      } catch (e) {
        console.log("cant assign amount", e);
      }
      if (isUnshield(amount)) {
        type = TxType.UNSHIELD;
        from = TOKEN_POOL_PUBKEY_USDC!.toBase58();
        to = findSplUnshieldRecipient(tx, amount, fee);
        token = Token.USDC;
      } else if (isShield(amount)) {
        type = TxType.SHIELD;
        from = getBase58(accountKeys[0]);
        to = TOKEN_POOL_PUBKEY_USDC!.toBase58();
        token = Token.USDC;
      }
  }

  const leavesPdaIndex = tx.meta?.postBalances.findIndex(
    (el, i) => tx.meta?.postBalances[i] === LEAVES_PDA_RENT
  );

  if (leavesPdaIndex === -1) {
    console.log("can't find leaves pda - setting isComplete = false");
    isComplete = false;
  }

  const leavesPda =
    leavesPdaIndex !== -1 ? getBase58(accountKeys[leavesPdaIndex]) : undefined;

  const nullifierPdaIndices: number[] = tx.meta.postBalances.reduce<number[]>(
    (acc, el, i) => {
      if (el === NULLIFIER_PDA_RENT) acc.push(i);
      return acc;
    },
    []
  );

  const nullifierPdas = nullifierPdaIndices
    .map((i) => getBase58(accountKeys[i]))
    .filter((pda): pda is string => pda !== undefined);

  let accountState: { data: Buffer | null } = { data: null };
  let leaves: Buffer | undefined;
  let leaf0: string | undefined;
  let leaf1: string | undefined;

  if (leavesPda) {
    try {
      const lpa = new PublicKey(leavesPda);

      const info = await limiter
        .removeTokens(1)
        .then(() => connection.getAccountInfo(lpa, "confirmed"));
      if (info?.data) {
        accountState = { data: info.data };
        leaves = info.data.slice(10, 74);
        leaf0 = toFixedHex(leaves.slice(0, 32).reverse());
        leaf1 = toFixedHex(leaves.slice(32, 64).reverse());
      }
    } catch (e) {
      console.log("error fetching leavesPda account: ", e);
    }
  }

  if (
    !leavesPda ||
    !leaf0 ||
    !leaf1 ||
    !accountState.data ||
    nullifierPdas.length !== 2 ||
    !signature
  ) {
    console.log(
      "can't fetch all data for transaction, setting isComplete= false"
    );
    isComplete = false;
  }

  // Ensure all required fields are present
  if (!from || !to || !type || !leaf0 || !leaf1) {
    isComplete = false;
  }

  transactions.push({
    amount: Math.abs(amount),
    blockTime: tx.blockTime ? tx.blockTime * 1000 : 0,
    slot: tx.slot,
    signer: getBase58(accountKeys[0]),
    signature: signature,
    to: to || "",
    from: from || "",
    type: type || "",
    owner: "", // This field seems unused in the code
    accountKeys: accountKeys.map((key) => getBase58(key)),
    leaves: {
      pda: leavesPda || "",
      commitments: [leaf0 || "", leaf1 || ""],
      data: [], // Changed from null to empty array to match type
      index: accountState.data
        ? new U64(accountState.data.slice(2, 10)).toString()
        : undefined,
    },
    nullifiers: nullifierPdas,
    token: token,
    isComplete,
  });
}

export async function getAllTransactions({
  connection,
  token,
}: {
  connection: Connection;
  token: Token;
}) {
  let merkleTrees = [];
  if (token === Token.SOL) merkleTrees.push(TOKEN_POOL_PUBKEY);
  else if (token === Token.USDC) merkleTrees.push(TOKEN_POOL_PUBKEY_USDC);
  else {
    console.log("config error: token must be 'sol' or 'usdc'. returning... ");
    return [];
  }
  const allTransactions: LightTransaction[] = [];

  // Create output file at the start
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `transactions_${token.toLowerCase()}_${timestamp}.json`;
  const outputPath = path.join(process.cwd(), "data", filename);

  // Ensure data directory exists
  await fs.mkdir(path.join(process.cwd(), "data"), { recursive: true });

  // Initialize file with empty array
  await fs.writeFile(outputPath, JSON.stringify([], null, 2), "utf-8");
  console.log(`Created output file: ${filename}`);

  for (let tree of merkleTrees) {
    const BATCH_SIZE = 500;
    let transactions: LightTransaction[] = [];
    let lastSig: string | null = null;
    let hasMoreSignatures = true;
    let totalProcessed = 0;
    let totalSaved = 0;

    console.time("Transaction Processing");

    while (hasMoreSignatures) {
      try {
        const signatures = await limiter.removeTokens(1).then(() =>
          connection.getSignaturesForAddress(
            tree!,
            {
              limit: BATCH_SIZE,
              before: lastSig || undefined,
            },
            "confirmed"
          )
        );

        if (signatures.length === 0) {
          hasMoreSignatures = false;
          break;
        }

        console.log(`\nFetching batch of ${signatures.length} signatures...`);
        lastSig = signatures[signatures.length - 1].signature;

        const txs = await limiter.removeTokens(1).then(() =>
          connection.getParsedTransactions(
            signatures.map((sig) => sig.signature),
            {
              maxSupportedTransactionVersion: 0,
              commitment: "confirmed",
            }
          )
        );

        const validTxs = txs.filter(
          (tx): tx is ParsedTransactionWithMeta =>
            tx !== null && tx.meta !== null
        );

        totalProcessed += validTxs.length;
        console.log(`Processing ${validTxs.length} valid transactions...`);

        // Parse all transactions in parallel
        await Promise.all(
          validTxs.map((tx) =>
            parseTransactions({
              tx,
              transactions,
              connection,
              token,
            })
          )
        );

        // After each batch, append new transactions to file
        if (transactions.length > 0) {
          // Read existing transactions
          const existingData = await fs.readFile(outputPath, "utf-8");
          const existingTransactions = JSON.parse(existingData);

          // Append new transactions
          const updatedTransactions = [
            ...existingTransactions,
            ...transactions,
          ];

          // Write back to file
          await fs.writeFile(
            outputPath,
            JSON.stringify(updatedTransactions, null, 2),
            "utf-8"
          );

          totalSaved += transactions.length;
          console.log(
            `✓ Saved ${transactions.length} new transactions (Total: ${totalSaved})`
          );

          // Clear the transactions array after saving
          transactions = [];
        }

        console.log(
          `Progress: ${totalProcessed} transactions processed, ${totalSaved} saved`
        );
      } catch (e) {
        console.log("Batch failed, retrying after 1s...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
    }

    console.timeEnd("Transaction Processing");
    allTransactions.push(...transactions);
  }

  const sortedTransactions = allTransactions.sort(
    (a, b) => b.blockTime - a.blockTime
  );

  console.log(`\n✅ Processing complete!`);
  console.log(`Total transactions processed: ${allTransactions.length}`);
  console.log(`Output file: ${filename}`);

  return sortedTransactions;
}
