//@ts-check
import nacl from "tweetnacl";
import { LeafAccount } from "./util";
import { Token } from "../constants";
import { PublicKey } from "@solana/web3.js";

// all utxos that were created after the slot arent encrypted with legacy encryption anymore
// const MERKLE_TREE_PDA_PUBKEY = new solana.PublicKey(
//   "AVyGbAJFQVwjTaMAaNV59wzTWMrkghscv1bDxy1WPCFv",
// );
// const MERKLE_TREE_PDA_PUBKEY_USDC = new solana.PublicKey(
//   "DJ9iVqcMaT4n97H3pAu85dVKfrTKsnXxKAd6W8dX74rb",
// );

// MAINNET:
const MERKLE_TREE_PDA_PUBKEY = new PublicKey(
  "8PEM1idiDmUJc3efD3Qm1sfHMDs1BPgWHCbNc2bvXdeR"
);
const MERKLE_TREE_PDA_PUBKEY_USDC = new PublicKey(
  "DTQURsWrgs3ysUPYAcZ87sEuUb5WS1DA2nnTmYdATnza"
);

const firstBlockOfLaunchEpochMinusOne = 204768000; // epoch: 474 // GRACE PERIOD START
// const firstBlockOfLaunchEpoch = 205632005; // epoch: 476 // ACTUAL DEPLOY DAY
const firstBlockOfLaunchEpochPlusTwo = 206496010; // 205632005 + 864005 (diff)  epoch: 478~ // V2 ONLY START (200?)

const ENCRYPTION_V2_START_SLOT = firstBlockOfLaunchEpochPlusTwo;
const ENCRYPTION_V2_START_GRACE_PERIOD = firstBlockOfLaunchEpochMinusOne;

const isV2Encryption = (slot: number) => slot > ENCRYPTION_V2_START_SLOT;
const isV2RolloverPeriod = (slot: number) =>
  slot <= ENCRYPTION_V2_START_SLOT && slot > ENCRYPTION_V2_START_GRACE_PERIOD;

export type DecryptedUtxo = {
  token: Token | null;
  utxo:
    | boolean
    | {
        buf: Buffer<ArrayBuffer>;
        index: any;
      }
    | null;
  legacy: boolean;
};

export const tryDecryptBytes = (
  sortedLeafAccounts: LeafAccount[],
  recipientEncryptionKeypair: nacl.BoxKeyPair,
  recipientEncryptionKeypairLegacy: nacl.BoxKeyPair
) => {
  let userUtxos: any[] = [];
  let userIndices: number[] = [];
  sortedLeafAccounts.map((acc) => {
    let {
      encryptedUtxos,
      merkletreePubkey: { bytes },
    } = acc;
    const publicKey = new PublicKey(bytes);
    let token =
      publicKey.toBase58() === MERKLE_TREE_PDA_PUBKEY?.toBase58()
        ? Token.SOL
        : publicKey.toBase58() === MERKLE_TREE_PDA_PUBKEY_USDC?.toBase58()
        ? Token.USDC
        : null;
    let decrypted: DecryptedUtxo[] = []; // CHECK
    let utxoPair = [encryptedUtxos.utxo0, encryptedUtxos.utxo1];
    let nonces = [encryptedUtxos.nonce0, encryptedUtxos.nonce1];
    let senderThrowAwayPubkeys = [
      encryptedUtxos.senderThrowAwayPubkey0,
      encryptedUtxos.senderThrowAwayPubkey1,
    ];

    utxoPair.map((encryptedUtxo, i) => {
      let [success1, utxoBytes1] = decryptIntoBytes(
        encryptedUtxo,
        nonces[i],
        senderThrowAwayPubkeys[i],
        recipientEncryptionKeypair,
        acc.index.u64
      );

      if (success1) {
        let utxo = utxoBytes1;
        decrypted.push({ token: token!, utxo: utxo as any, legacy: false });
        if (!userIndices.includes(Number(acc.index.u64) / 2)) {
          userIndices.push(Number(acc.index.u64) / 2);
        }
      } else {
        let [success2, utxoBytes2] = decryptIntoBytes(
          encryptedUtxo,
          nonces[i],
          senderThrowAwayPubkeys[i],
          recipientEncryptionKeypairLegacy,
          acc.index.u64
        );
        if (success2) {
          let utxo = utxoBytes2;
          decrypted.push({ token: token!, utxo: utxo as any, legacy: true });
          if (!userIndices.includes(Number(acc.index.u64) / 2)) {
            userIndices.push(Number(acc.index.u64) / 2);
          }
        }
      }

      let [success3, utxoBytes3] = decryptIntoBytes(
        encryptedUtxo,
        nonces[i],
        senderThrowAwayPubkeys[i],
        recipientEncryptionKeypair,
        acc.index.u64
      );

      if (success3) {
        let utxo = utxoBytes3;
        decrypted.push({ token: token!, utxo: utxo as any, legacy: false });
        if (!userIndices.includes(Number(acc.index.u64) / 2)) {
          userIndices.push(Number(acc.index.u64) / 2);
        }
      }

      let [successLegacy, utxoBytesLegacy] = decryptIntoBytes(
        encryptedUtxo,
        nonces[i],
        senderThrowAwayPubkeys[i],
        recipientEncryptionKeypairLegacy,
        acc.index.u64
      );
      if (successLegacy) {
        let utxo = utxoBytesLegacy;
        decrypted.push({ token: token!, utxo: utxo as any, legacy: true });
        if (!userIndices.includes(Number(acc.index.u64) / 2)) {
          userIndices.push(Number(acc.index.u64) / 2);
        }
      }
    });

    userUtxos.push(...decrypted);
  });

  return { userUtxos, userIndices };
};

function decryptIntoBytes(
  encryptedUtxo: Uint8Array,
  nonce: Uint8Array,
  senderThrowAwayPubkey: Uint8Array,
  recipientEncryptionKeypair: nacl.BoxKeyPair,
  index: number | string
) {
  var cleartext = nacl.box.open(
    new Uint8Array(encryptedUtxo),
    new Uint8Array(nonce),
    new Uint8Array(senderThrowAwayPubkey),
    new Uint8Array(recipientEncryptionKeypair.secretKey)
  );

  if (!cleartext) {
    return [false, null];
  }
  var buf = Buffer.from(cleartext);
  return [true, { buf, index }];
}

export const decryptLeaves = (
  sortedLeafAccounts: { sol: LeafAccount[]; usdc: LeafAccount[] },
  recipientEncryptionKeypair: nacl.BoxKeyPair,
  recipientEncryptionKeypairLegacy: nacl.BoxKeyPair
) => {
  let { userUtxos: decryptedUtxoBytesSol, userIndices } = tryDecryptBytes(
    sortedLeafAccounts.sol,
    recipientEncryptionKeypair,
    recipientEncryptionKeypairLegacy
  );

  let { userUtxos: decryptedUtxoBytesUsdc } = tryDecryptBytes(
    sortedLeafAccounts.usdc,
    recipientEncryptionKeypair,
    recipientEncryptionKeypairLegacy
  );

  return {
    decryptedUtxoBytes: {
      sol: decryptedUtxoBytesSol,
      usdc: decryptedUtxoBytesUsdc,
    },
    userIndices,
  };
};
