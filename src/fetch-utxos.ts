import { PublicKey } from "@solana/web3.js";
import { Connection } from "@solana/web3.js";
import { PROGRAM_ID } from "./constants";
import { Utxo } from "./utxo";
import { leInt2Buffer, toFixedHex } from "./utils";
import { LightTransaction } from "./get-user-transactions";

type TransactionAndUtxoGroup = {
  utxo: Utxo;
  nullifierPda: string;
  commitment: string;
  inTx: LightTransaction | undefined;
  outTx: LightTransaction | undefined;
};

export function fetchAllUtxos() {}

export async function getNullifiers(connection: Connection) {
  var nullifierAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
    commitment: "confirmed",
    filters: [{ dataSize: 2 }],
  });
  console.log("Nullifier Accounts:", nullifierAccounts);
  let nullifierPubkeys: string[] = [];
  nullifierAccounts.map((acc) => nullifierPubkeys.push(acc.pubkey.toBase58()));
  return nullifierPubkeys;
}

export function getTransactionAndUtxoGroups(
  userTransactions: LightTransaction[],
  spentUtxos: Utxo[]
): TransactionAndUtxoGroup[] {
  // get all nullifiers and commitments from spentUtxos
  let nullifiersAndCommitments = [];

  for (let i = 0; i < spentUtxos.length; i++) {
    let utxo = spentUtxos[i];
    let nullifierPda = PublicKey.findProgramAddressSync(
      // [110,102] nonce like onchain
      [leInt2Buffer(utxo.getNullifier().toString()), [110, 102]],
      PROGRAM_ID
    )[0].toBase58();

    let commitment = toFixedHex(utxo.getCommitment());

    nullifiersAndCommitments.push({
      utxo: utxo,
      nullifierPda: nullifierPda,
      commitment: commitment,
      nullifierString: utxo.getNullifier().toString(),
    });
  }

  let transactionAndUtxoGroups = [];

  for (let i = 0; i < nullifiersAndCommitments.length; i++) {
    let nullifierAndCommitment = nullifiersAndCommitments[i];
    let nullifier = nullifierAndCommitment.nullifierString;
    let commitment = nullifierAndCommitment.commitment;
    let utxo = nullifierAndCommitment.utxo;
    let inTx = userTransactions.find((tx) => tx.nullifiers.includes(nullifier));

    let outTx = userTransactions.find((tx) =>
      tx.leaves.commitments.includes(commitment)
    );

    if (inTx || outTx) {
      transactionAndUtxoGroups.push({
        utxo: utxo,
        nullifierPda: nullifier,
        commitment: commitment,
        inTx: inTx, // tx where the utxo was spent (input)
        outTx: outTx, // tx where the utxo was created (output)
      });
    }
  }
  return transactionAndUtxoGroups;
}
