import { PublicKey } from "@solana/web3.js";
import { leInt2Buffer } from "../utils";
import { PROGRAM_ID } from "../constants";
import { toFixedHex } from "../utils";
import { NULLIFIER_NONCE } from "../constants";
import { Utxo } from "../utxo";
const { U64 } = require("n64");

export type LeafAccount = {
  slot: number;
  index: {
    u64: string;
    bytes: Uint8Array;
  };
  leaves: {
    left: Uint8Array;
    right: Uint8Array;
  };
  merkletreePubkey: {
    publicKey: PublicKey;
    bytes: Uint8Array;
  };
  encryptedUtxos: {
    utxo0: Uint8Array;
    nonce0: Uint8Array;
    senderThrowAwayPubkey0: Uint8Array;
    utxo1: Uint8Array;
    nonce1: Uint8Array;
    senderThrowAwayPubkey1: Uint8Array;
  };
};

export const isUtxoNullified = (
  utxo: Utxo,
  nullifierPublicKeys: string[],
  leaves: string[]
) => {
  utxo.index = leaves.indexOf(toFixedHex(utxo.getCommitment()));
  let nullifier = PublicKey.findProgramAddressSync(
    [leInt2Buffer(utxo.getNullifier().toString()), NULLIFIER_NONCE],
    PROGRAM_ID
  );
  if (nullifierPublicKeys.indexOf(nullifier[0].toBase58()) < 0) {
    return false;
  } else {
    return true;
  }
};

export function dedupeLeafAccounts(
  sortedLeafAccounts: LeafAccount[]
): LeafAccount[] {
  const uniqueSortedLeafAccounts: LeafAccount[] = [];
  sortedLeafAccounts.forEach((acc) => {
    if (!uniqueSortedLeafAccounts.find((x) => x.index === acc.index)) {
      uniqueSortedLeafAccounts.push(acc);
    }
  });
  return uniqueSortedLeafAccounts;
}

export const roundTo = (amount: number, decimals: number = 1) =>
  Math.round(Number(amount + Number.EPSILON) * (10 ^ decimals)) /
  (10 ^ decimals);

export const round = (numb: number, decimals = 2) => +numb.toFixed(decimals);

export const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export function intToFloat(num: number, decPlaces: number) {
  return num.toFixed(decPlaces);
}

export const uint8ArrayToArray = (uint8Array: Uint8Array) => {
  let array: any[] = [];
  uint8Array.forEach((x: any, i: number) => {
    array[i] = x;
  });
  return array;
};

export const leafAccountToBytes = (
  leafAccount: {
    account: { data: Uint8Array };
  },
  slot: number | 0
): LeafAccount => {
  let parsedData = {
    slot: slot,
    index: {
      u64: U64(leafAccount.account.data.slice(2, 10)).toString(),
      bytes: leafAccount.account.data.slice(2, 10),
    },
    leaves: {
      left: leafAccount.account.data.slice(10, 42),
      right: leafAccount.account.data.slice(42, 74),
    },
    merkletreePubkey: {
      publicKey: new PublicKey(leafAccount.account.data.slice(74, 106)),
      bytes: leafAccount.account.data.slice(74, 106),
    },
    encryptedUtxos: {
      utxo0: leafAccount.account.data.slice(106, 161),
      nonce0: leafAccount.account.data.slice(161, 185),
      senderThrowAwayPubkey0: leafAccount.account.data.slice(185, 217),
      utxo1: leafAccount.account.data.slice(217, 272),
      nonce1: leafAccount.account.data.slice(272, 296),
      senderThrowAwayPubkey1: leafAccount.account.data.slice(296, 328),
    },
  };
  return parsedData;
};
