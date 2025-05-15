import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./constants";
import { leInt2Buffer, toFixedHex } from "./utils";
import { ProcessedUtxo } from "./types";

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
};

export function getUserTransactions(
  transactions: LightTransaction[],
  spentUtxos: ProcessedUtxo[]
) {
  // for each utxo in spentUtxos, check if it's nullifier is in the unshieldTxs
  let userTransactions: LightTransaction[] = [];
  for (let i = 0; i < spentUtxos.length; i++) {
    let utxo = spentUtxos[i];

    // Check regular utxo

    let nullifierPda = PublicKey.findProgramAddressSync(
      // [110,102] nonce like onchain
      [leInt2Buffer(utxo.utxo.getNullifier().toString()), [110, 102]],
      PROGRAM_ID
    )[0].toBase58();
    let txN = transactions.find((tx) => {
      return tx.nullifiers?.includes(nullifierPda);
    });
    if (txN) {
      // only push if it's not already in the array
      if (!userTransactions.find((t) => t.signature === txN.signature)) {
        userTransactions.push(txN);
      }
    }

    // Check legacy utxo

    let nullifierPdaLegacy = PublicKey.findProgramAddressSync(
      [leInt2Buffer(utxo.utxoLegacy.getNullifier().toString()), [110, 102]],
      PROGRAM_ID
    )[0].toBase58();
    let txNLegacy = transactions.find((tx) => {
      return tx.nullifiers?.includes(nullifierPdaLegacy);
    });
    if (txNLegacy) {
      if (!userTransactions.find((t) => t.signature === txNLegacy.signature)) {
        userTransactions.push(txNLegacy);
      }
    }

    // Check regular commitment
    let commitment = toFixedHex(utxo.utxo.getCommitment());
    let txC = transactions.find((tx) => {
      return tx.leaves?.commitments?.includes(commitment);
    });
    if (txC) {
      if (!userTransactions.find((t) => t.signature === txC.signature)) {
        userTransactions.push(txC);
      }
    }

    // Check legacy commitment
    let commitmentLegacy = toFixedHex(utxo.utxoLegacy.getCommitment());
    let txCLegacy = transactions.find((tx) => {
      return tx.leaves?.commitments?.includes(commitmentLegacy);
    });
    if (txCLegacy) {
      if (!userTransactions.find((t) => t.signature === txCLegacy.signature)) {
        userTransactions.push(txCLegacy);
      }
    }
  }

  return userTransactions;
}
