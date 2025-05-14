import { Connection, PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./constants";
import { leInt2Buffer, toFixedHex } from "./utils";
import { Utxo } from "./utxo";

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
export type UserUtxo = {
  utxo: Utxo;
  spent: boolean;
  token: string;
};

export function getUserTransactions(
  transactions: LightTransaction[],
  spentUtxos: UserUtxo[]
) {
  // for each utxo in spentUtxos, check if it's nullifier is in the unshieldTxs
  let userTransactions: LightTransaction[] = [];
  for (let i = 0; i < spentUtxos.length; i++) {
    let utxo = spentUtxos[i];

    if (utxo.spent) {
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
    }

    let commitment = toFixedHex(utxo.utxo.getCommitment());
    let txC = transactions.find((tx) => {
      return tx.leaves?.commitments?.includes(commitment);
    });
    if (txC) {
      // only push if it's not already in the array
      if (!userTransactions.find((t) => t.signature === txC.signature)) {
        userTransactions.push(txC);
      }
    }
  }

  return userTransactions;
}
